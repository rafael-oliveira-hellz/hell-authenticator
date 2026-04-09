import { AccountResponse, CreateAccountRequest } from '../../../types';

export type CreateAccountCommand = {
  userId: string;
  data: CreateAccountRequest;
};

export type CreateAccountPort = {
  createAccount: (userId: string, data: CreateAccountRequest) => Promise<AccountResponse>;
};

export class CreateAccountUseCase {
  constructor(private readonly port: CreateAccountPort) {}

  async execute(command: CreateAccountCommand): Promise<AccountResponse> {
    return this.port.createAccount(command.userId, command.data);
  }
}
