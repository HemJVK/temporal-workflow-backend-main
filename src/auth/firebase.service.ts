import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    
    if (serviceAccountPath) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
    } else {
      // Fallback to project ID if no service account file is provided (e.g. in cloud environment)
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      if (projectId) {
        admin.initializeApp({
          projectId: projectId,
        });
      } else {
        console.warn('Firebase Admin not initialized: Missing FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID');
      }
    }
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch (error) {
      throw new Error('Invalid Firebase token');
    }
  }
}
