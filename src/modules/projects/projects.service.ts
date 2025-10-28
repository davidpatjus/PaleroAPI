/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../../db/config';
import { projectsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectStatus } from './interfaces/project.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly notificationsService: NotificationsService) {}
  // Create a new project
  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    // Input data validation
    if (!Object.values(ProjectStatus).includes(createProjectDto.status)) {
      throw new BadRequestException('Invalid project status');
    }
    // Insert into database
    const [project] = await db
      .insert(projectsTable)
      .values({
        name: createProjectDto.name,
        description: createProjectDto.description,
        clientId: createProjectDto.clientId,
        status: createProjectDto.status,
        startDate: createProjectDto.startDate
          ? new Date(createProjectDto.startDate)
          : null,
        endDate: createProjectDto.endDate
          ? new Date(createProjectDto.endDate)
          : null,
      })
      .returning();

    const createdProject = this.toProject(project);

    // 🔔 Send notification to client about new project
    await this.notificationsService.create({
      userId: createProjectDto.clientId,
      type: 'PROJECT_CREATED',
      message: `A new project has been created for you: "${createProjectDto.name}"`,
      entityType: 'PROJECT',
      entityId: project.id,
    });

    return createdProject;
  }

  // List all projects
  async findAll(): Promise<Project[]> {
    const projects = await db.select().from(projectsTable);
    return projects.map((project) => this.toProject(project));
  }

  // Find a project by ID
  async findOne(id: string): Promise<Project> {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, id));
    if (!project) throw new NotFoundException('Project not found');
    return this.toProject(project);
  }

  // Update a project
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    // Get current project to compare changes
    const [currentProject] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, id));

    if (!currentProject) {
      throw new NotFoundException('Project not found');
    }

    const [updated] = await db
      .update(projectsTable)
      .set({
        ...updateProjectDto,
        startDate: updateProjectDto.startDate
          ? new Date(updateProjectDto.startDate)
          : undefined,
        endDate: updateProjectDto.endDate
          ? new Date(updateProjectDto.endDate)
          : undefined,
      })
      .where(eq(projectsTable.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Project not found');

    // 🔔 Send notification for status changes
    await this.handleProjectUpdateNotifications(
      currentProject,
      updated,
      updateProjectDto,
    );

    return this.toProject(updated);
  }

  // Delete a project
  async remove(id: string): Promise<void> {
    const result = await db
      .delete(projectsTable)
      .where(eq(projectsTable.id, id))
      .returning();
    if (!result || result.length === 0)
      throw new NotFoundException('Project not found');
  }

  // 🔔 Private method to handle notifications in project updates
  private async handleProjectUpdateNotifications(
    currentProject: any,
    updatedProject: any,
    updateDto: UpdateProjectDto,
  ): Promise<void> {
    // Notification for status change
    if (updateDto.status && currentProject.status !== updatedProject.status) {
      const statusNames = {
        PENDING: 'Pending',
        IN_PROGRESS: 'In Progress',
        REVIEW: 'Under Review',
        COMPLETED: 'Completed',
        ARCHIVED: 'Archived',
      };

      // Notify the client
      await this.notificationsService.create({
        userId: updatedProject.clientId,
        type: 'PROJECT_STATUS_UPDATED',
        message: `Your project "${updatedProject.name}" status changed to: ${statusNames[updatedProject.status] || updatedProject.status}`,
        entityType: 'PROJECT',
        entityId: updatedProject.id,
      });
    }
  }

  // Transform DB entity to Project interface
  private toProject(entity: any): Project {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || '',
      clientId: entity.clientId,
      status: (entity.status as string).toUpperCase() as ProjectStatus,
      startDate: entity.startDate
        ? entity.startDate.toISOString().split('T')[0]
        : undefined,
      endDate: entity.endDate
        ? entity.endDate.toISOString().split('T')[0]
        : undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
