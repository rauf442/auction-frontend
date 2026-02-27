// frontend/src/lib/realtime-chat.ts
import { io, Socket } from 'socket.io-client';
import type { Message, User as UserType } from '@/types/api';

export interface ChatNotification {
    id: string;
    type: 'message' | 'task' | 'system';
    title: string;
    message: string;
    timestamp: Date;
    sender?: {
        name: string;
        avatar?: string;
    };
    data?: any;
}

export interface TypingUser {
    userId: string;
    userName: string;
    isTyping: boolean;
}

export interface UserStatus {
    userId: string;
    status: 'online' | 'offline';
    lastSeen: string;
}

class RealtimeChatService {
    private socket: Socket | null = null;
    private currentUser: UserType | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    // Event handlers
    private onMessageReceived: ((message: Message) => void) | null = null;
    private onMessageSent: ((message: Message) => void) | null = null;
    private onMessageUpdated: ((message: Message) => void) | null = null;
    private onMessageDeleted: ((messageId: string) => void) | null = null;
    private onTaskAssigned: ((task: Message) => void) | null = null;
    private onTaskStatusChanged: ((data: any) => void) | null = null;
    private onTypingStatus: ((typingUser: TypingUser) => void) | null = null;
    private onUserStatus: ((userStatus: UserStatus) => void) | null = null;
    private onNotification: ((notification: ChatNotification) => void) | null = null;
    private onConnectionStatus: ((connected: boolean) => void) | null = null;
    private onUnreadCountUpdate: ((count: number) => void) | null = null;

    constructor() {
        // Don't load user on construction to avoid SSR issues
        // User will be loaded lazily when needed
    }

    private loadCurrentUser() {
        try {
            // Check if we're on the client side before accessing localStorage
            if (typeof window === 'undefined') {
                return; // Skip on server side
            }

            const userStr = localStorage.getItem('user');
            if (userStr) {
                this.currentUser = JSON.parse(userStr);
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }

    public async connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if we're on the client side before accessing localStorage
                if (typeof window === 'undefined') {
                    reject(new Error('Cannot connect to realtime chat from server side'));
                    return;
                }

                const token = localStorage.getItem('token');

                if (!token) {
                    reject(new Error('No authentication token found'));
                    return;
                }

                if (this.socket && this.isConnected) {
                    resolve();
                    return;
                }

                const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

                console.log('🔌 Attempting to connect to:', backendUrl);
                console.log('🔌 Using token:', token ? 'Present' : 'Missing');

                // Check if socket.io is available
                if (typeof io === 'undefined') {
                    reject(new Error('Socket.io library is not loaded. Please check your dependencies.'));
                    return;
                }

                // Check backend health before attempting socket connection
                const isHealthy = await this.checkBackendHealth();
                if (!isHealthy) {
                    console.warn('⚠️ Backend health check failed - backend may not be running');
                }

                try {
                    this.socket = io(backendUrl, {
                        auth: {
                            token: token
                        },
                        transports: ['websocket', 'polling'],
                        reconnection: true,
                        reconnectionAttempts: this.maxReconnectAttempts,
                        reconnectionDelay: 1000,
                        timeout: 20000,
                        forceNew: true
                    });

                    console.log('🔌 Socket created:', !!this.socket);
                    console.log('🔌 Socket ID:', this.socket?.id);

                } catch (socketError: any) {
                    console.error('❌ Socket creation error:', socketError);
                    reject(new Error(`Socket creation failed: ${socketError?.message || socketError || 'Unknown error'}`));
                    return;
                }

                // Check if socket was created successfully
                if (!this.socket) {
                    // console.error('❌ Socket is null after creation attempt');
                    // reject(new Error('Socket creation returned null - check network connectivity and backend URL'));
                    return;
                }

                this.setupEventHandlers();

                this.socket.once('connect', () => {
                    console.log('🔌 Connected to realtime chat service');
                    console.log('🔌 Socket ID:', this.socket?.id);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.onConnectionStatus?.(true);

                    // Load current user when connecting
                    this.loadCurrentUser();

                    // Emit online status
                    this.socket?.emit('user:online');

                    resolve();
                });

                this.socket.once('connect_error', (error) => {
                    console.error('❌ Failed to connect to realtime chat service:', error);
                    this.isConnected = false;
                    this.onConnectionStatus?.(false);

                    // Provide more helpful error messages
                    let errorMessage = 'Failed to connect to realtime chat service';
                    if (error.message.includes('xhr poll error')) {
                        errorMessage += ' - Backend server may not be running or network connectivity issue';
                    } else if (error.message.includes('Authentication')) {
                        errorMessage += ' - Authentication failed, please check your token';
                    } else if (error.message.includes('timeout')) {
                        errorMessage += ' - Connection timeout, please check network connectivity';
                    }

                    reject(new Error(`${errorMessage}: ${error.message}`));
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private setupEventHandlers() {
        if (!this.socket) return;

        // Connection events
        this.socket?.on('disconnect', (reason) => {
            console.log('🔌 Disconnected from realtime chat service:', reason);
            this.isConnected = false;
            this.onConnectionStatus?.(false);
        });

        this.socket?.on('reconnect', (attemptNumber) => {
            console.log(`🔌 Reconnected to realtime chat service (attempt ${attemptNumber})`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.onConnectionStatus?.(true);
            this.socket?.emit('user:online');
        });

        this.socket?.on('reconnect_failed', () => {
            console.error('❌ Failed to reconnect to realtime chat service');
            this.isConnected = false;
            this.onConnectionStatus?.(false);
        });

        // Message events
        this.socket?.on('message:new', (message: Message) => {
            console.log('📨 New message received:', message);
            console.log('📨 Current user ID:', this.currentUser?.auth_user_id);
            console.log('📨 Message receiver ID:', message.receiver_id);
            this.onMessageReceived?.(message);

            // Create notification if message is not from current user
            if (message.sender_id !== this.currentUser?.auth_user_id) {
                this.createNotification({
                    type: message.message_type === 'task' ? 'task' : 'message',
                    title: message.message_type === 'task' ? 'New Task Assigned' : 'New Message',
                    message: message.message_type === 'task' ? message.task_title || 'New task' : message.content,
                    sender: {
                        name: message.sender_name || 'Unknown'
                    },
                    data: message
                });
            }
        });

        this.socket?.on('message:sent', (message: Message) => {
            console.log('✅ Message sent confirmation:', message);
            this.onMessageSent?.(message);
        });

        this.socket?.on('message:updated', (message: Message) => {
            console.log('📝 Message updated:', message);
            this.onMessageUpdated?.(message);
        });

        this.socket?.on('message:deleted', (data: { messageId: string }) => {
            console.log('🗑️ Message deleted:', data.messageId);
            this.onMessageDeleted?.(data.messageId);
        });

        this.socket?.on('message:read', (data: { messageId: string; readBy: string; readAt: string }) => {
            console.log('👁️ Message read:', data);
            // Handle read receipts
        });

        // Task events
        this.socket?.on('task:assigned', (task: Message) => {
            console.log('📋 Task assigned:', task);
            this.onTaskAssigned?.(task);

            this.createNotification({
                type: 'task',
                title: 'Task Assigned to You',
                message: task.task_title || 'New task',
                sender: {
                    name: task.sender_name || 'Unknown'
                },
                data: task
            });
        });

        this.socket?.on('task:status_changed', (data: any) => {
            console.log('📋 Task status changed:', data);
            this.onTaskStatusChanged?.(data);

            if (data.newStatus === 'completed') {
                this.createNotification({
                    type: 'task',
                    title: 'Task Completed',
                    message: `Task "${data.message?.task_title || 'Unknown'}" has been completed`,
                    data: data
                });
            }
        });

        // Typing events
        this.socket?.on('user:typing', (typingUser: TypingUser) => {
            this.onTypingStatus?.(typingUser);
        });

        // User status events
        this.socket?.on('user:status', (userStatus: UserStatus) => {
            this.onUserStatus?.(userStatus);
        });

        // Reaction events
        this.socket?.on('reaction:added', (data: any) => {
            console.log('👍 Reaction added:', data);
            // Handle reaction updates
        });

        this.socket?.on('reaction:removed', (data: any) => {
            console.log('👎 Reaction removed:', data);
            // Handle reaction updates
        });

        // System events
        this.socket?.on('system:notification', (notification: any) => {
            console.log('🔔 System notification:', notification);
            this.createNotification({
                type: 'system',
                title: notification.title || 'System Notification',
                message: notification.message || '',
                data: notification
            });
        });
    }

    private createNotification(notification: Omit<ChatNotification, 'id' | 'timestamp'>) {
        const fullNotification: ChatNotification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };

        this.onNotification?.(fullNotification);
    }

    // Public methods for sending events
    public startTyping(receiverId: string) {
        this.socket?.emit('typing:start', { receiverId });
    }

    public stopTyping(receiverId: string) {
        this.socket?.emit('typing:stop', { receiverId });
    }

    public markMessageAsRead(messageId: string) {
        this.socket?.emit('message:read', { messageId });
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.onConnectionStatus?.(false);
        }
    }

    // Event handler setters
    public onMessage(handler: (message: Message) => void) {
        this.onMessageReceived = handler;
    }

    public onMessageSentConfirmation(handler: (message: Message) => void) {
        this.onMessageSent = handler;
    }

    public onMessageUpdate(handler: (message: Message) => void) {
        this.onMessageUpdated = handler;
    }

    public onMessageDelete(handler: (messageId: string) => void) {
        this.onMessageDeleted = handler;
    }

    public onTaskAssignment(handler: (task: Message) => void) {
        this.onTaskAssigned = handler;
    }

    public onTaskStatusChange(handler: (data: any) => void) {
        this.onTaskStatusChanged = handler;
    }

    public onTyping(handler: (typingUser: TypingUser) => void) {
        this.onTypingStatus = handler;
    }

    public onUserStatusChange(handler: (userStatus: UserStatus) => void) {
        this.onUserStatus = handler;
    }

    public onNotificationReceived(handler: (notification: ChatNotification) => void) {
        this.onNotification = handler;
    }

    public onConnectionStatusChange(handler: (connected: boolean) => void) {
        this.onConnectionStatus = handler;
    }

    public onUnreadCountChange(handler: (count: number) => void) {
        this.onUnreadCountUpdate = handler;
    }

    // Getters
    public get connected(): boolean {
        return this.isConnected;
    }

    public get user(): UserType | null {
        return this.currentUser;
    }

    public loadUser() {
        this.loadCurrentUser();
    }

    // Method to retry connection
    public async retryConnection(): Promise<void> {
        console.log('🔄 Retrying connection...');
        if (this.socket) {
            this.disconnect();
        }
        return this.connect();
    }

    // Method to check if backend is reachable
    private async checkBackendHealth(): Promise<boolean> {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const healthUrl = `${backendUrl}/`;

            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.warn('Backend health check failed:', error);
            return false;
        }
    }
}

// Lazy-loaded singleton to avoid SSR issues
let realtimeChatServiceInstance: RealtimeChatService | null = null;

export const getRealtimeChatService = (): RealtimeChatService => {
    if (typeof window === 'undefined') {
        throw new Error('RealtimeChatService cannot be used on server side');
    }

    if (!realtimeChatServiceInstance) {
        realtimeChatServiceInstance = new RealtimeChatService();
    }

    return realtimeChatServiceInstance;
};

// For backward compatibility, export a proxy that defers instantiation
export const realtimeChatService = new Proxy({} as RealtimeChatService, {
    get(target, prop) {
        const service = getRealtimeChatService();
        return service[prop as keyof RealtimeChatService];
    }
});

export default RealtimeChatService;
