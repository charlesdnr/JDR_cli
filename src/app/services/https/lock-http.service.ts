// src/app/services/https/lock-http.service.ts
import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { firstValueFrom } from 'rxjs';
import { ResourceType } from '../../enum/ResourceType';
import { LockAcquisitionRequestDTO } from '../../interfaces/lock/LockAcquisitionRequestDTO';
import { LockResult } from '../../interfaces/lock/LockResult';
import { ResourcePermissionCheckRequestDTO } from '../../interfaces/lock/ResourcePermissionCheckRequestDTO';
import { LockInfo } from '../../interfaces/lock/LockInfo'; // Added import

@Injectable({
  providedIn: 'root'
})
export class LockHttpService extends BaseHttpService {

  constructor() {
    super('api/locks');
  }

  /** POST /api/locks/acquire */
  acquireLock(request: LockAcquisitionRequestDTO): Promise<LockResult> {
    const url = `${this.baseApiUrl}/acquire`;
    return firstValueFrom(this.httpClient.post<LockResult>(url, request));
  }

  /** DELETE /api/locks/{lockToken} */
  releaseLock(lockToken: string): Promise<{ released: boolean; lockToken: string; message: string }> {
    return this.delete<{ released: boolean; lockToken: string; message: string }>(lockToken);
  }

  /** PUT /api/locks/{lockToken}/renew */
  renewLock(lockToken: string, extensionMinutes: number = 5): Promise<{ renewed: boolean; lockToken?: string; message: string; expiresAt?: string }> {
    const url = `${this.baseApiUrl}/${lockToken}/renew?extensionMinutes=${extensionMinutes}`;
    return firstValueFrom(this.httpClient.put<{ renewed: boolean; lockToken?: string; message: string; expiresAt?: string }>(url, {}));
  }

  /** GET /api/locks/user/me */
  getMyLocks(): Promise<LockInfo[]> {
    const url = `${this.baseApiUrl}/user/me`;
    return firstValueFrom(this.httpClient.get<LockInfo[]>(url));
  }

  /** GET /api/locks/user/{userId} */
  getUserLocks(userId: number): Promise<LockInfo[]> {
    const url = `${this.baseApiUrl}/user/${userId}`;
    return firstValueFrom(this.httpClient.get<LockInfo[]>(url));
  }

  /** GET /api/locks/resource/{resourceType}/{resourceId} */
  getResourceLocks(resourceType: ResourceType, resourceId: number): Promise<LockInfo[]> {
    const url = `${this.baseApiUrl}/resource/${resourceType}/${resourceId}`;
    return firstValueFrom(this.httpClient.get<LockInfo[]>(url));
  }

  /** POST /api/locks/validate */
  validateLock(lockToken: string): Promise<{ valid: boolean; lockToken: string; message: string }> {
    const url = `${this.baseApiUrl}/validate`;
    return firstValueFrom(this.httpClient.post<{ valid: boolean; lockToken: string; message: string }>(url, { lockToken }));
  }

  /** POST /api/locks/check-permission */
  checkModificationPermission(request: ResourcePermissionCheckRequestDTO): Promise<{
    canModify: boolean;
    userId: number;
    resourceType: ResourceType;
    resourceId: number;
    existingLocks: LockInfo[];
    lockCount: number;
  }> {
    const url = `${this.baseApiUrl}/check-permission`;
    return firstValueFrom(this.httpClient.post<any>(url, request));
  }

  /** DELETE /api/locks/admin/force-release/{lockToken} */
  forceReleaseLock(lockToken: string): Promise<{ forcedRelease: boolean; lockToken: string; releasedBy: number; message: string }> {
    const url = `${this.baseApiUrl}/admin/force-release/${lockToken}`;
    return firstValueFrom(this.httpClient.delete<any>(url));
  }

  /** DELETE /api/locks/admin/user/{userId}/release-all */
  releaseAllUserLocks(userId: number): Promise<{ releasedCount: number; userId: number; releasedBy: number; message: string }> {
    const url = `${this.baseApiUrl}/admin/user/${userId}/release-all`;
    return firstValueFrom(this.httpClient.delete<any>(url));
  }
}