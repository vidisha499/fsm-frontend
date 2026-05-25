import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Service to manage tasks. After a task is created, it calls the backend
 * notification endpoint so that the user assigned to the task receives an
 * FCM push notification.
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  // Adjust these URLs to match your backend routes
  private tasksUrl = '/api/tasks';
  private notifyUrl = '/api/notify-task';

  constructor(private http: HttpClient) {}

  /**
   * Fetch all tasks for the current user.
   */
  getTasks(): Observable<any[]> {
    return this.http.get<any[]>(this.tasksUrl);
  }

  /**
   * Create a new task.
   * The `task` object should contain at least:
   *   - title: string
   *   - description?: string
   *   - assignedTo: string // userId of the assignee
   */
  createTask(task: any): Observable<any> {
    console.log('Creating task:', task);
    return this.http.post<any>(this.tasksUrl, task).pipe(
      // After the task is successfully saved, notify the assignee.
      tap(createdTask => {
        console.log('Task created response:', createdTask);
        if (createdTask && createdTask.assignedTo) {
          this.notifyAssignee(createdTask.assignedTo, createdTask);
        }
      })
    );
  }

  /**
   * Call backend endpoint that sends an FCM push notification to the user.
   * The backend should look up the stored FCM token for `userId` and send a
   * notification with the task title.
   */
  private notifyAssignee(userId: string, task: any): void {
    const payload = {
      userId,
      title: 'नया टास्क असाइन किया गया',
      body: `आपको नया टास्क मिला: ${task.title}`,
      data: { taskId: task.id }
    };
    // Fire‑and‑forget – we don't need to wait for a response in UI
    this.http.post(this.notifyUrl, payload).subscribe({
      next: () => console.log('Notification request sent for user', userId),
      error: err => console.error('Failed to send notification', err)
    });
  }
}
