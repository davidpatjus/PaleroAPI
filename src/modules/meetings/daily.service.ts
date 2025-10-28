import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DailyRoom,
  DailyErrorResponse,
  DailyDeleteResponse,
} from './interfaces';

@Injectable()
export class DailyService implements OnModuleInit {
  private apiKey: string;
  private readonly apiUrl = 'https://api.daily.co/v1';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('DAILY_API_KEY');
    if (!apiKey) {
      throw new Error('DAILY_API_KEY is not set in environment variables');
    }
    this.apiKey = apiKey;
  }

  async createRoom(
    name: string,
    isPrivate: boolean,
    exp?: number,
  ): Promise<DailyRoom> {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          name,
          privacy: isPrivate ? 'private' : 'public',
          properties: {
            exp: exp, // Unix timestamp for expiration
          },
        }),
      };

      const response = await fetch(`${this.apiUrl}/rooms`, options);

      // Intentar obtener el texto de la respuesta primero
      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Failed to create Daily room (${response.status})`;
        try {
          const error = JSON.parse(responseText) as DailyErrorResponse;
          errorMessage = `Failed to create Daily room: ${error.info || error.error || errorMessage}`;
        } catch {
          errorMessage = `Failed to create Daily room: ${responseText.substring(0, 200)}`;
        }
        throw new Error(errorMessage);
      }

      return JSON.parse(responseText) as DailyRoom;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create Daily room: Unknown error');
    }
  }

  async deleteRoom(name: string): Promise<boolean> {
    try {
      const options = {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      };

      const response = await fetch(`${this.apiUrl}/rooms/${name}`, options);

      // Intentar obtener el texto de la respuesta primero
      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Failed to delete Daily room (${response.status})`;
        try {
          const error = JSON.parse(responseText) as DailyErrorResponse;
          errorMessage = `Failed to delete Daily room: ${error.info || error.error || errorMessage}`;
        } catch {
          errorMessage = `Failed to delete Daily room: ${responseText.substring(0, 200)}`;
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText) as DailyDeleteResponse;
      return data.deleted === true;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete Daily room: Unknown error');
    }
  }
}
