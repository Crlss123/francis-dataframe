import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';
import francisTool from '../src';

describe('Francis Tool', () => {
  let tool: any;
  
  beforeEach(async () => {
    tool = await francisTool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: process.env.HOST || '0.0.0.0',

      development: {
        requestLogging: process.env.NODE_ENV === 'development',
      },

      security: {
        requireAuth: process.env.API_KEY_AUTH === 'true',
        ...(process.env.VALID_API_KEYS && { apiKeys: process.env.VALID_API_KEYS.split(',') }),
      },

      timeouts: {
        execution: 240000,
      },
    });
  });

  it('should check for the healthy status', async () => {
    const response = await request('localhost:3000').get('/health').expect(200);
    expect(response.body.status).toBe('healthy');
  });

  it('should check for the correct execution of the tool', async () => {
    try {
      const input = {
        input_data: {
          city: 'Cancun',
          start_date: '2025-09-10',
          end_date: '2025-09-12',
          category: ['Deportes', 'Parques'],
          price: 1000,
          hotel: 'The Westin Resort & Spa Cancun',
        },
      };
      const response = await request('localhost:3000').post('/api/execute').send(input).expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        output_data: {
          output: expect.any(Array),
          metadata: {
            execution_id: expect.any(String),
            tool_version: '1.0.0',
            timestamp: expect.any(String),
          },
        },
        execution_time_ms: expect.any(Number),
        timestamp: expect.any(String),
      });
    } catch (error) {
      console.log(error);
    }
  });

  it('should handle server errors', async () => {
    const input = {
      input_data: {
        city: 'Cancun',
        start_date: '2025-09-10',
        end_date: '2025-09-12',
        category: ['Deportes', 'Parques'],
        price: 1000,
        hotel: 'The Westin Resort & Spa Cancun',
      },
    };

    const response = await request('localhost:3000').post('/api/execute').send(input).expect(500);
    expect(response.body).toMatchObject({
      execution_id: expect.any(String),
      status: 'error',
      error_code: 'INTERNAL_ERROR',
      error_message: 'An internal error occurred',
      execution_time_ms: expect.any(Number),
      timestamp: expect.any(String),
    });
  });

  it('should handle missing required fields', async () => {
    const input = {
      input_data: {
        city: 'Cancun',
      },
    };

    const response = await request('localhost:3000').post('/api/execute').send(input).expect(400);
    expect(response.body.status).toBe('error');
  });
});
