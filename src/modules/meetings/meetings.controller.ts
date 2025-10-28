import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingParticipantsService } from './meeting-participants.service';
import { WebhooksService } from './webhooks.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  AddParticipantDto,
  UpdateParticipantDto,
  DailyWebhookDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Meeting, MeetingParticipant } from './interfaces';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly participantsService: MeetingParticipantsService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createMeetingDto: CreateMeetingDto,
    @Request() req: { user: { id: string } },
  ): Promise<Meeting> {
    return this.meetingsService.create(createMeetingDto, req.user.id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<Meeting[]> {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
  ): Promise<Meeting> {
    return this.meetingsService.update(id, updateMeetingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.meetingsService.remove(id);
  }

  // Endpoints de participantes
  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  async addParticipants(
    @Param('id') id: string,
    @Body() addParticipantDto: AddParticipantDto,
  ): Promise<MeetingParticipant[]> {
    return this.participantsService.addParticipants(id, addParticipantDto);
  }

  @Get(':id/participants')
  @HttpCode(HttpStatus.OK)
  async getParticipants(
    @Param('id') id: string,
  ): Promise<MeetingParticipant[]> {
    return this.participantsService.getParticipants(id);
  }

  @Patch(':id/participants/:userId')
  @HttpCode(HttpStatus.OK)
  async updateParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ): Promise<MeetingParticipant> {
    return this.participantsService.updateParticipant(
      id,
      userId,
      updateParticipantDto,
    );
  }

  @Delete(':id/participants/:userId')
  @HttpCode(HttpStatus.OK)
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    return this.participantsService.removeParticipant(id, userId);
  }
}

// Controller separado para webhooks (sin autenticación JWT)
@Controller('meetings/webhook')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() webhookDto: DailyWebhookDto): Promise<any> {
    return this.webhooksService.handleDailyWebhook(webhookDto);
  }
}
