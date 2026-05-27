/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Photo {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  file_path: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
