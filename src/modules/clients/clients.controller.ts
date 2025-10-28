import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CompleteClientProfileDto } from './dto/complete-client-profile.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Endpoints para Administradores

  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }

  // Endpoints para el Perfil del Cliente

  @Get('profile/by-user/:userId')
  getMyProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.clientsService.getMyProfile(userId);
  }

  @Post('profile/by-user/:userId')
  completeMyProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() completeProfileDto: CompleteClientProfileDto,
  ) {
    return this.clientsService.createMyProfile(userId, completeProfileDto);
  }
}
