import request from 'supertest';
import francisTool from '../src/index';
import { testTool, testToolHealth, testToolDirect } from '@ai-spine/tools-testing';

describe('Francis Tool', () => {

  describe('Tool Execution', () => {
    it('should execute successfully with valid input', async () => {
      const input = {
        city: 'Cancun',
        start_date: '2025-09-11',
        end_date: '2025-09-13',
        category: ['Deportes', 'Parques'],
        price: 1000,
        hotel: 'The Westin Resort & Spa Cancun',
      };

      const response = await testToolDirect(francisTool, input);
      expect(response.success).toBe(true);
    });

    it('should handle missing required data', async () => {
      const input = {
        city: 'Cancun',
      };

      const response = await testToolDirect(francisTool, input);
      expect(response.success).toBe(false);
    });

    it('should check for health', async () => {

      const response = await testToolHealth("francis");
      expect(response.success).toBe(false);
    });
  });
});
