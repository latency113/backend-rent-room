import { Elysia, t } from 'elysia';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabase';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const uploadController = new Elysia({ prefix: '/api/upload' })
  .post(
    '/',
    async ({ body, set, request }) => {
      try {
        const files: File[] = [];
        const rawFiles = (body as any).files;
        const rawFile = (body as any).file;

        if (Array.isArray(rawFiles)) {
          files.push(...rawFiles);
        } else if (rawFiles instanceof File) {
          files.push(rawFiles);
        } else if (rawFile instanceof File) {
          files.push(rawFile);
        }

        if (files.length === 0) {
          set.status = 400;
          return { success: false, error: 'กรุณาแนบไฟล์รูปภาพอย่างน้อย 1 ไฟล์' };
        }

        const origin = new URL(request.url).origin;
        const uploadedUrls: string[] = [];
        const bucketName = 'room-images';

        for (const file of files) {
          const mimeType = file.type || '';
          if (mimeType && !mimeType.startsWith('image/')) {
            continue;
          }

          let ext = path.extname(file.name) || '';
          if (!ext) {
            if (mimeType.includes('png')) ext = '.png';
            else if (mimeType.includes('webp')) ext = '.webp';
            else if (mimeType.includes('gif')) ext = '.gif';
            else ext = '.jpg';
          }

          const randomStr = Math.random().toString(36).substring(2, 9);
          const filename = `room_${Date.now()}_${randomStr}${ext}`;
          const buffer = await file.arrayBuffer();

          let fileUrl: string | null = null;

          // 1. Try uploading to Supabase Storage (Cloud CDN)
          try {
            const { data: storageData, error: storageError } = await supabase.storage
              .from(bucketName)
              .upload(filename, Buffer.from(buffer), {
                contentType: mimeType || 'image/jpeg',
                upsert: true
              });

            if (!storageError && storageData) {
              const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filename);

              if (publicUrlData?.publicUrl) {
                fileUrl = publicUrlData.publicUrl;
                console.log(`[UploadController] ✅ Uploaded to Supabase Storage: ${fileUrl}`);
              }
            } else if (storageError) {
              console.warn(`[UploadController] Supabase Storage upload note (${storageError.message}). Using local storage fallback.`);
            }
          } catch (storageErr: any) {
            console.warn(`[UploadController] Supabase Storage exception: ${storageErr.message}. Using local storage fallback.`);
          }

          // 2. Fallback to Local Disk if Supabase Storage is not ready or failed
          if (!fileUrl) {
            const filePath = path.join(uploadDir, filename);
            await Bun.write(filePath, buffer);
            fileUrl = `${origin}/uploads/${filename}`;
            console.log(`[UploadController] 📁 Saved to local uploads: ${fileUrl}`);
          }

          uploadedUrls.push(fileUrl);
        }

        if (uploadedUrls.length === 0) {
          set.status = 400;
          return { success: false, error: 'ไฟล์ที่ส่งมาไม่ใช่ไฟล์รูปภาพที่รองรับ' };
        }

        return {
          success: true,
          message: `อัปโหลดรูปภาพสำเร็จ ${uploadedUrls.length} รูป`,
          urls: uploadedUrls,
          url: uploadedUrls[0]
        };
      } catch (err: any) {
        set.status = 500;
        console.error('[UploadController] error:', err);
        return { success: false, error: `เกิดข้อผิดพลาดในการอัปโหลด: ${err.message}` };
      }
    }
  );
