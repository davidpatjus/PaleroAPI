import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { ChatModule } from './modules/chat/chat.module';
import { MeetingsModule } from './modules/meetings/meetings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.development'
          : '.env.development',
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    ClientsModule,
    SubtasksModule,
    CommentsModule,
    InvoicesModule,
    NotificationsModule,
    StorageModule,
    ChatModule,
    MeetingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
