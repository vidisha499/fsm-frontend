import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/data.service';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false
})
export class ChatPage implements OnInit {
  conversations: any[] = [];
  activeChat: any = null;
  messages: any[] = [];
  newMessage: string = '';
  isFetching: boolean = false;
  errorMessage: string = '';
  currentUserId: string = '';

  constructor(
    private dataService: DataService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.currentUserId = localStorage.getItem('ranger_id') || 'me';
    this.loadConversations();
  }

  async loadConversations() {
    this.isFetching = true;
    this.errorMessage = '';
    this.dataService.getConversations().subscribe({
      next: (res: any) => {
        this.isFetching = false;
        this.conversations = res.data || res || [];
      },
      error: (err) => {
        this.isFetching = false;
        console.error('getConversations error:', err);
        this.errorMessage = 'Server is not responding. This feature will be available once the API is active.';
      }
    });
  }

  async openChat(chat: any) {
    this.activeChat = chat;
    const loading = await this.loadingCtrl.create({ message: 'Loading messages...', duration: 5000 });
    await loading.present();

    const payload = { receiver_id: chat.id || chat.user_id };

    const apiCall = chat.is_group 
      ? this.dataService.getGroupChatHistory(payload)
      : this.dataService.getChatHistory(payload);

    apiCall.subscribe({
      next: (res: any) => {
        loading.dismiss();
        this.messages = res.data || res || [];
      },
      error: (err) => {
        loading.dismiss();
        this.messages = [];
        console.error('getChatHistory error:', err);
      }
    });
  }

  closeChat() {
    this.activeChat = null;
    this.messages = [];
    this.newMessage = '';
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    this.messages.push({
      sender_id: this.currentUserId,
      message: this.newMessage,
      created_at: new Date().toISOString()
    });
    this.newMessage = '';
  }
}
