import { clientRepository } from "../repositories/clientRepository";
import { AppError } from "../utils/AppError";

export const clientService = {
  list: () => clientRepository.list(),

  async getById(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw AppError.notFound("Client not found");
    return client;
  },

  create: (data: { name: string; email: string; company: string }) => clientRepository.create(data),

  async update(id: string, data: Partial<{ name: string; email: string; company: string }>) {
    await this.getById(id);
    return clientRepository.update(id, data);
  },

  async remove(id: string) {
    await this.getById(id);
    return clientRepository.remove(id);
  },
};
