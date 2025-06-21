interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retryCount: number;
}

class OfflineQueueService {
  private readonly STORAGE_KEY = 'kgcpr_offline_queue';
  private readonly MAX_RETRIES = 3;

  addToQueue(url: string, method: string, headers: Record<string, string>, body: any): void {
    const request: QueuedRequest = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      method,
      headers,
      body: JSON.stringify(body),
      timestamp: Date.now(),
      retryCount: 0
    };

    const queue = this.getQueue();
    queue.push(request);
    this.saveQueue(queue);

    console.log('🟡 Offline Queue: Request added to queue', { url, timestamp: request.timestamp });
  }

  async syncQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      console.log('🟢 Offline Queue: No requests to sync');
      return;
    }

    console.log(`🟢 Offline Queue: Syncing ${queue.length} queued requests`);
    const successfulRequests: string[] = [];
    const failedRequests: QueuedRequest[] = [];

    for (const request of queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });

        if (response.ok) {
          console.log('✅ Offline Queue: Request synced successfully', { 
            url: request.url, 
            id: request.id 
          });
          successfulRequests.push(request.id);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ Offline Queue: Request sync failed', { 
          url: request.url, 
          id: request.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        request.retryCount++;
        if (request.retryCount < this.MAX_RETRIES) {
          failedRequests.push(request);
        } else {
          console.error('🚫 Offline Queue: Request exceeded max retries, dropping', { 
            url: request.url, 
            id: request.id 
          });
        }
      }
    }

    // Update queue with only failed requests that haven't exceeded retry limit
    this.saveQueue(failedRequests);

    if (successfulRequests.length > 0) {
      console.log(`🎉 Offline Queue: ${successfulRequests.length} requests synced successfully`);
    }
  }

  getQueueSize(): number {
    return this.getQueue().length;
  }

  clearQueue(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Offline Queue: Queue cleared');
  }

  private getQueue(): QueuedRequest[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Offline Queue: Failed to parse stored queue', error);
      return [];
    }
  }

  private saveQueue(queue: QueuedRequest[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('❌ Offline Queue: Failed to save queue to localStorage', error);
    }
  }
}

export const offlineQueueService = new OfflineQueueService();