import functions_framework
import os
import tempfile
from google.cloud import storage
from PIL import Image

# Init Client
storage_client = storage.Client()

# INI PENYELAMATMU. Decorator ini memberitahu Google:
# "Hei, aku siap menerima data format baru (Gen 2)"
@functions_framework.cloud_event
def resize_image(cloud_event):
    """Fungsi hybrid yang tahan banting."""
    
    # Ambil data dari event tunggal itu
    data = cloud_event.data
    
    # Debug print biar kelihatan di log
    print(f"📦 Menerima Event Data: {data}")

    # Ambil nama bucket dan file
    bucket_name = data.get('bucket')
    file_name = data.get('name')

    # Safety check (kadang data kosong saat test)
    if not bucket_name or not file_name:
        print("⚠️ Data event kosong atau format salah.")
        return

    # 1. CEGAH INFINITE LOOP
    if "_thumb" in file_name:
        print(f"Skipping thumbnail: {file_name}")
        return

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)

    # Cek apakah ini gambar (by extension juga, buat jaga-jaga)
    is_image = file_name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
    if not is_image and (blob.content_type and 'image' not in blob.content_type):
        print(f"File {file_name} bukan gambar. Skip.")
        return

    print(f"🔨 Memproses: {file_name}...")

    # 2. Download
    _, temp_local_filename = tempfile.mkstemp()
    blob.download_to_filename(temp_local_filename)

    # 3. Resize
    temp_thumb_filename = temp_local_filename + "_thumb"
    try:
        with Image.open(temp_local_filename) as image:
            # Convert mode ke RGB kalau ketemu PNG transparan biar bisa di-save jadi JPEG
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
                
            image.thumbnail((300, 300))
            
            new_filename = f"{os.path.splitext(file_name)[0]}_thumb.jpg"
            image.save(temp_thumb_filename, format="JPEG", quality=80)

        # 4. Upload Balik
        new_blob = bucket.blob(new_filename)
        new_blob.upload_from_filename(temp_thumb_filename)
        new_blob.content_type = "image/jpeg"
        
        print(f"✅ SUKSES! Thumbnail: {new_filename}")

    except Exception as e:
        print(f"❌ Error saat processing: {e}")

    finally:
        if os.path.exists(temp_local_filename): os.remove(temp_local_filename)
        if os.path.exists(temp_thumb_filename): os.remove(temp_thumb_filename)