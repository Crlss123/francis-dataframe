/**
 * Francis - Tool para obtener un itinerario de las distintas experiencias que el usuario puede vivir, de acuerdo a los datos de entrada y los filtros que esta tenga.
 *
 * This AI Spine tool provides basic text processing capabilities with configurable
 * parameters and robust input validation. It demonstrates the fundamental patterns
 * for building AI Spine compatible tools.
 *
 * Generated on 2025-09-05 using create-ai-spine-tool v1.0.0
 * Template: , Language: typescript
 *
 * @fileoverview Main tool implementation for francis
 * @author AI Spine Developer
 * @since 1.0.0
 */

// Load environment variables from .env file
import 'dotenv/config';
import { spawn } from 'child_process';
import getWeather from './apis/weather';
import { getDateRange } from './utils';
import { WeatherRequest } from './apis/weather';
import { createClient } from '@supabase/supabase-js';

import {
  createTool,
  stringField,
  numberField,
  booleanField,
  apiKeyField,
  arrayField,
} from '@ai-spine/tools';
import { resolve } from 'path';
import { json } from 'stream/consumers';
import { request } from 'http';

/**
 * Input interface defining the structure of data that users will provide
 * to this tool. This interface ensures type safety and enables automatic
 * validation and documentation generation.
 */
interface FrancisInput {
  city: string;
  start_date: string;
  end_date: string;
  category: string[];
  price: number;
}

/**
 * Configuration interface defining settings that can be provided via
 * environment variables or configuration files. These settings typically
 * include API keys, service endpoints, and operational parameters.
 */
interface FrancisConfig {
  /** Optional API key for external service integrations */
  api_key?: string;
}

/**
 * Main tool instance created using the AI Spine createTool factory.
 * This tool implements the universal AI Spine contract, making it compatible
 * with all AI Spine platforms and runtimes.
 */
const francisTool = createTool<FrancisInput, FrancisConfig>({
  /**
   * Tool metadata provides information about the tool's identity,
   * capabilities, and usage. This information is used for documentation
   * generation, tool discovery, and runtime introspection.
   */
  metadata: {
    name: 'francis',
    version: '1.0.0',
    description: 'Tool used to obtain a experiences itinerary based on user input and filters.',
    capabilities: ['text-processing'],
    author: 'Your Name',
    license: 'MIT',
  },

  /**
   * Schema definition describes the structure and validation rules for
   * both input data and configuration. The AI Spine framework uses this
   * schema to automatically validate inputs, generate documentation,
   * and provide type safety.
   */
  schema: {
    /**
     * Input schema defines the fields that users can provide when
     * executing this tool. Each field includes validation rules,
     * descriptions, and default values.
     */
    input: {
      city: stringField({
        required: true,
        description: 'The city to search for activities',
        minLength: 1,
        maxLength: 100,
      }),
      start_date: stringField({
        required: true,
        description: 'The start date for the activity search',
        minLength: 10,
        maxLength: 10,
      }),
      end_date: stringField({
        required: true,
        description: 'The end date for the activity search',
        minLength: 10,
        maxLength: 10,
      }),
      category: arrayField(
        stringField({
          required: true,
          description: 'The category of activities to search for',
          minLength: 1,
          maxLength: 100,
        })
      ),
      price: numberField({
        required: true,
        description: 'The price range for activities to search for',
        min: 0,
        max: 10000,
      }),
    },

    /**
     * Configuration schema defines settings that can be provided via
     * environment variables or configuration files. These are typically
     * used for API keys, service endpoints, and operational parameters.
     */
    config: {
      api_key: apiKeyField({
        required: false,
        description: 'Optional API key for external services',
      }),
    },
  },

  /**
   * The execute function contains the main business logic of the tool.
   * It receives validated input data, configuration, and execution context,
   * then performs the requested operation and returns structured results.
   *
   * @param input - Validated input data matching the input schema
   * @param config - Configuration settings from environment/config files
   * @param context - Execution context with metadata and tracking information
   * @returns Promise resolving to structured execution results
   */
  async execute(input, config, context) {
    console.log(`Executing francis tool with execution ID: ${context.executionId}`);

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL as string,
        process.env.SUPABASE_KEY as string
      );
      const { data, error } = await supabase.from('requests').insert({}).select();

      const requestId = data?.[0]?.id ?? null;
      // const result = await new Promise<string>((resolve, reject) => {
      //   const python = spawn('python3', ['src/scripts/main.py'], {
      //     env: {
      //       ...process.env,
      //       DB_PASSWORD: process.env.DB_PASSWORD,
      //       SUPABASE_URL: process.env.SUPABASE_URL,
      //       SUPABASE_KEY: process.env.SUPABASE_KEY,
      //       RAPID_API_KEY: process.env.RAPID_API_KEY,
      //       RAPID_API_HOST: process.env.RAPID_API_HOST,
      //       BASE_URL: process.env.BASE_URL,
      //     },
      //   });

      //   let output = '';
      //   let errorOutput = '';

      //   python.stdin.write(JSON.stringify(input));
      //   python.stdin.end();

      //   python.stdout.on('data', data => {
      //     output += data.toString();
      //   });

      //   python.stderr.on('data', data => {
      //     errorOutput += data.toString();
      //   });

      //   python.on('exit', (code, signal) => {
      //     console.log('Python exited:', code, signal);
      //   });

      //   python.on('close', code => {
      //     if (code !== 0) {
      //       reject(new Error(`Python exited with code ${code}. Error: ${errorOutput}`));
      //     } else {
      //       resolve(output);
      //     }
      //   });
      // });

      const startDate = input.start_date;
      const endDate = input.end_date;
      const location = input.city;
      const category = input.category;
      const price = input.price;
      const dateRange = getDateRange(startDate, endDate);
      console.log(input);
      const weatherRequest: WeatherRequest = {
        location,
        days: dateRange,
      };
      const weatherReports = await getWeather(weatherRequest);

      const forecasts = weatherReports.map(report => ({
        json: report,
        request_id: requestId,
      }));

      const { data: weatherData, error: weatherError } = await supabase
        .from('weather_forecasts')
        .insert(forecasts);

      const scrapping = await new Promise<any>((resolve, reject) => {
        const python = spawn('python3', ['src/scripts/betterScrapper.py'], {
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY,
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_KEY: process.env.SUPABASE_KEY,
          },
        });

        let output = '';
        let errorOutput = '';

        python.stdin.write(
          JSON.stringify({
            start_date: startDate,
            end_date: endDate,
            city: location,
            category,
            price,
          })
        );
        python.stdin.end();

        python.stdout.on('data', data => {
          output += data.toString();
        });

        python.stderr.on('data', data => {
          errorOutput += data.toString();
        });

        python.on('close', code => {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
          } else {
            try {
              resolve(output);
            } catch (err) {
              reject(new Error('Error parsing Python output: ' + err));
            }
          }
        });
      });

      console.log(scrapping);

      return {
        status: 'success',
        data: {
          metadata: {
            execution_id: context.executionId,
            timestamp: context.timestamp.toISOString(),
            tool_version: '1.0.0',
          },
        },
      };
    } catch (error) {
      console.error('Error processing message:', error);
      // Always provide meaningful error messages to help users troubleshoot issues
      throw new Error(
        `Failed to process message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

/**
 * Main entry point that starts the tool server with configurable options.
 * The server exposes REST endpoints that comply with the AI Spine universal contract:
 * - GET /health - Health check and tool metadata
 * - POST /execute - Execute the tool with input data
 * - GET /schema - Tool schema and documentation
 *
 * Configuration is loaded from environment variables, allowing for flexible
 * deployment across different environments.
 */
async function main() {
  try {
    await francisTool.start({
      // Server configuration from environment variables with sensible defaults
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: process.env.HOST || '0.0.0.0',

      // Development features for easier debugging and testing
      development: {
        requestLogging: process.env.NODE_ENV === 'development',
      },

      // Security configuration for production deployments
      security: {
        requireAuth: process.env.API_KEY_AUTH === 'true',
        ...(process.env.VALID_API_KEYS && { apiKeys: process.env.VALID_API_KEYS.split(',') }),
      },
    });

    console.log(`🚀 Francis tool server started successfully`);
    console.log(`📡 Listening on port ${process.env.PORT || 3000}`);
    console.log(`🔗 Health check: http://localhost:${process.env.PORT || 3000}/health`);
  } catch (error) {
    console.error('Failed to start tool server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handlers ensure the tool server stops cleanly when
 * receiving termination signals. This is important for:
 * - Completing ongoing requests
 * - Cleaning up resources
 * - Proper logging and monitoring
 * - Container orchestration compatibility
 */

// Handle SIGINT (Ctrl+C) for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, shutting down gracefully...');
  await francisTool.stop();
  process.exit(0);
});

// Handle SIGTERM (container/process manager termination) for graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  await francisTool.stop();
  process.exit(0);
});

// Start the server if this file is run directly (not when imported as a module)
if (require.main === module) {
  main();
}

/**
 * Export the tool instance for use in tests, other modules, or programmatic usage.
 * This allows the tool to be imported and used without starting the HTTP server.
 */
export default francisTool;
