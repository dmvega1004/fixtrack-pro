import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getHello(): Promise<string> {
    // Hace una consulta real a Supabase para contar las empresas
    const companiesCount = await this.prisma.company.count();
    return `FixTrack Pro API - Estado: Activo 🚀 | Empresas registradas en la nube: ${companiesCount}`;
  }
}
