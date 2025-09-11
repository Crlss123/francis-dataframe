import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';
import { testTool, testToolHealth, testToolDirect } from '@ai-spine/tools-testing';
import {
  createTool,
  stringField,
  numberField,
  booleanField,
  apiKeyField,
  arrayField,
} from '@ai-spine/tools';

import { getBookingInfo, getScraperInfo } from '../src/apis/python';
import getWeather, { WeatherRequest } from '../src/apis/weather';
import { getDateRange } from '../src/utils';
import {
  createHotelActivities,
  createRequest,
  createWeatherForecasts,
} from '../src/supabaseController';
import { runSystem } from '../src/apis/sys';
import { getHotelFacilities } from '../src/apis/hotel';
import francisTool from '../src';

describe('Francis Tool', () => {
  let tool: any;

  // beforeEach(async () => {
  //   tool = francisTool;
  // });

  // beforeEach(async () => {
  //   tool = createTool<FrancisInput, FrancisConfig>({
  //     metadata: {
  //       name: 'francis',
  //       version: '1.0.0',
  //       description: 'Tool used to obtain a experiences itinerary based on user input and filters.',
  //       capabilities: ['text-processing'],
  //       author: 'Your Name',
  //       license: 'MIT',
  //     },
  //     schema: {
  //       input: {
  //         city: stringField({
  //           required: true,
  //           description: 'The city to search for activities',
  //           minLength: 1,
  //           maxLength: 100,
  //         }),
  //         start_date: stringField({
  //           required: true,
  //           description: 'The start date for the activity search',
  //           minLength: 10,
  //           maxLength: 10,
  //         }),
  //         end_date: stringField({
  //           required: true,
  //           description: 'The end date for the activity search',
  //           minLength: 10,
  //           maxLength: 10,
  //         }),
  //         category: arrayField(
  //           stringField({
  //             required: true,
  //             description: 'The category of activities to search for',
  //             minLength: 1,
  //             maxLength: 100,
  //           })
  //         ),
  //         price: numberField({
  //           required: true,
  //           description: 'The price range for activities to search for',
  //           min: 0,
  //           max: 10000,
  //         }),
  //         hotel: stringField({
  //           required: true,
  //           description: 'The hotel where the user will be staying',
  //           minLength: 1,
  //           maxLength: 100,
  //         }),
  //       },
  //       config: {
  //         api_key: apiKeyField({
  //           required: false,
  //           description: 'Optional API key for external services',
  //         }),
  //       },
  //     },
  //     async execute(input, config, context) {
  //       console.log(`Executing francis tool with execution ID: ${context.executionId}`);
  //       try {
  //         const requestId = await createRequest();

  //         const startDate = input.start_date;
  //         const endDate = input.end_date;
  //         const location = input.city;
  //         const dateRange = getDateRange(startDate, endDate);
  //         const serviceInput = {
  //           city: input.city,
  //           start_date: input.start_date,
  //           end_date: input.end_date,
  //           category: input.category,
  //           price: input.price,
  //           hotel: input.hotel,
  //           request_id: requestId,
  //         };

  //         // Fetches weather forecasts of the location in the date range
  //         const weatherRequest: WeatherRequest = {
  //           location,
  //           days: dateRange,
  //         };

  //         const weatherReports = await getWeather(weatherRequest);
  //         const forecasts = weatherReports.map(report => ({
  //           json: report,
  //           request_id: requestId,
  //         }));

  //         createWeatherForecasts(forecasts);

  //         // Fetches hotel facilities

  //         const hotelResults = await getHotelFacilities({
  //           ...input,
  //           hotel: input.hotel || '',
  //         });

  //         if (hotelResults && hotelResults.length > 0) {
  //           const hotelRecords = hotelResults.map(hotel => ({
  //             json: hotel,
  //             request_id: requestId,
  //           }));
  //           createHotelActivities(hotelRecords);
  //         }

  //         // Fetches booking.com data from the python service
  //         await getBookingInfo(serviceInput);

  //         await getScraperInfo(serviceInput);

  //         const output = await runSystem(requestId, input);

  //         return {
  //           status: 'success',
  //           data: {
  //             output: output,
  //             metadata: {
  //               execution_id: context.executionId,
  //               timestamp: context.timestamp.toISOString(),
  //               tool_version: '1.0.0',
  //             },
  //           },
  //         };
  //       } catch (error) {
  //         console.error('Error processing message:', error);
  //         // Always provide meaningful error messages to help users troubleshoot issues
  //         throw new Error(
  //           `Failed to process message: ${error instanceof Error ? error.message : String(error)}`
  //         );
  //       }
  //     },
  //   });
  // });

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
