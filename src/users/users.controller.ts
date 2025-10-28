import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateFastClientDto } from './dto';
import { UserResponse } from './interfaces';
import { UUID } from 'crypto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crear un nuevo usuario
   * POST /api/users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Crear un fast client (usuario sin email ni password)
   * POST /api/users/fast-client
   */
  @Post('fast-client')
  @HttpCode(HttpStatus.CREATED)
  async createFastClient(
    @Body() createFastClientDto: CreateFastClientDto,
  ): Promise<UserResponse> {
    return this.usersService.createFastClient(createFastClientDto);
  }

  /**
   * Obtener todos los usuarios
   * GET /api/users
   */
  @Get()
  async findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  /**
   * Obtener un usuario por ID
   * GET /api/users/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: UUID): Promise<UserResponse> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  /**
   * Actualizar un usuario por ID
   * PATCH /api/users/:id
   */
  @Patch(':id')
  async update(
    @Param('id') id: UUID,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Eliminar un usuario por ID (soft delete)
   * DELETE /api/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: UUID): Promise<void> {
    return this.usersService.remove(id);
  }
}
