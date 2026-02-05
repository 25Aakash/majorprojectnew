import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, roleMiddleware, generateToken, AuthRequest } from '../../middleware/auth.middleware';
import { User } from '../../models/User.model';

// Mock User model
jest.mock('../../models/User.model');

const mockUser = {
  _id: 'user123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'student',
  password: 'hashedpassword',
};

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      headers: {},
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user123');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should contain userId in payload', () => {
      const token = generateToken('user123');
      const decoded = jwt.decode(token) as { userId: string };
      expect(decoded.userId).toBe('user123');
    });

    it('should have expiration set', () => {
      const token = generateToken('user123');
      const decoded = jwt.decode(token) as { exp: number };
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('authMiddleware', () => {
    it('should return 401 if no authorization header', async () => {
      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Access denied. No token provided.',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      mockRequest.headers = { authorization: 'Basic sometoken' };

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Access denied. No token provided.',
      });
    });

    it('should return 401 if token is invalid', async () => {
      mockRequest.headers = { authorization: 'Bearer invalidtoken' };

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invalid token.',
      });
    });

    it('should return 401 if user not found', async () => {
      const validToken = generateToken('user123');
      mockRequest.headers = { authorization: `Bearer ${validToken}` };
      
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invalid token. User not found.',
      });
    });

    it('should set user on request and call next if token is valid', async () => {
      const validToken = generateToken('user123');
      mockRequest.headers = { authorization: `Bearer ${validToken}` };
      
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthRequest).user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('roleMiddleware', () => {
    it('should return 401 if user is not set on request', () => {
      const middleware = roleMiddleware('admin');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Access denied. Not authenticated.',
      });
    });

    it('should return 403 if user does not have required role', () => {
      const middleware = roleMiddleware('admin');
      mockRequest = { ...mockRequest, user: mockUser as any };
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Access denied. Insufficient permissions.',
      });
    });

    it('should call next if user has required role', () => {
      const middleware = roleMiddleware('student');
      mockRequest = { ...mockRequest, user: mockUser as any };
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      const middleware = roleMiddleware('admin', 'student');
      mockRequest = { ...mockRequest, user: mockUser as any };
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
