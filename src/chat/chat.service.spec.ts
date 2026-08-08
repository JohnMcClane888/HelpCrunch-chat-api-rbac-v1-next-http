import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { Permission } from '../authorization/enums/permission.enum';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  const chats = {
    createConversation: jest.fn(),
    findConversation: jest.fn(),
    listAllConversations: jest.fn(),
    listConversationsForUser: jest.fn(),
    isActiveParticipant: jest.fn(),
    isCreator: jest.fn(),
    addParticipant: jest.fn(),
    closeConversation: jest.fn(),
    deleteConversation: jest.fn(),
    createMessage: jest.fn(),
  };

  const authorization = {
    hasAnyUserRole: jest.fn(),
    hasUserPermission: jest.fn(),
  };

  let service: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatService(chats as never, authorization as never);
  });

  it('creates a conversation and makes the creator the initial participant', async () => {
    const conversation = { id: 'c1' };
    chats.createConversation.mockResolvedValue(conversation);

    await expect(service.createConversation('u1', ' Support ')).resolves.toBe(conversation);
    expect(chats.createConversation).toHaveBeenCalledWith('u1', 'Support');
  });

  it('restricts ordinary users to conversations they participate in', async () => {
    authorization.hasAnyUserRole.mockResolvedValue(false);
    chats.findConversation.mockResolvedValue({ id: 'c1', status: 'OPEN' });
    chats.isActiveParticipant.mockResolvedValue(false);

    await expect(service.getConversation('u1', 'c1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows privileged roles to read conversations without participant membership', async () => {
    const conversation = { id: 'c1', status: 'OPEN' };
    authorization.hasAnyUserRole.mockResolvedValue(true);
    chats.findConversation.mockResolvedValue(conversation);

    await expect(service.getConversation('agent', 'c1')).resolves.toBe(conversation);
    expect(chats.isActiveParticipant).not.toHaveBeenCalled();
  });

  it('does not allow messages in closed conversations', async () => {
    authorization.hasAnyUserRole.mockResolvedValue(false);
    chats.findConversation.mockResolvedValue({ id: 'c1', status: 'CLOSED' });

    await expect(service.sendMessage('u1', 'c1', 'hello')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires an active participant to send a message', async () => {
    authorization.hasAnyUserRole.mockResolvedValue(false);
    chats.findConversation.mockResolvedValue({ id: 'c1', status: 'OPEN' });
    chats.isActiveParticipant.mockResolvedValue(false);

    await expect(service.sendMessage('u1', 'c1', 'hello')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets the creator close a conversation', async () => {
    authorization.hasAnyUserRole.mockResolvedValue(false);
    chats.findConversation.mockResolvedValue({ id: 'c1', status: 'OPEN' });
    chats.isCreator.mockResolvedValue(true);
    chats.closeConversation.mockResolvedValue({ id: 'c1', status: 'CLOSED' });

    await expect(service.closeConversation('u1', 'c1')).resolves.toEqual({
      id: 'c1',
      status: 'CLOSED',
    });
  });

  it('uses the delete permission gate before creator-level delete checks', async () => {
    authorization.hasUserPermission.mockResolvedValue(true);
    authorization.hasAnyUserRole.mockResolvedValue(false);
    chats.findConversation.mockResolvedValue({ id: 'c1' });
    chats.isCreator.mockResolvedValue(true);
    chats.deleteConversation.mockResolvedValue(undefined);

    await expect(service.deleteConversation('u1', 'c1')).resolves.toBeUndefined();
    expect(authorization.hasUserPermission).toHaveBeenCalledWith(
      'u1',
      Permission.CHAT_DELETE,
    );
  });
});
