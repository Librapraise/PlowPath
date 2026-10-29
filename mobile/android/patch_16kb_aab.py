import zipfile
import struct
import os
import sys
import tempfile
import shutil
import subprocess

def patch_16kb_alignment(aab_path, keystore_path, key_alias, store_pass, key_pass):
    print(f"[*] Processing App Bundle for 16 KB Page Alignment: {aab_path}")
    if not os.path.exists(aab_path):
        print(f"[!] File not found: {aab_path}")
        sys.exit(1)

    temp_dir = tempfile.mkdtemp()
    patched_aab = aab_path + ".tmp"

    try:
        # 1. Extract AAB
        with zipfile.ZipFile(aab_path, 'r') as zin:
            zin.extractall(temp_dir)

        # 2. Find and patch all .so files
        patched_count = 0
        total_so_count = 0
        for root, dirs, files in os.walk(temp_dir):
            for f in files:
                if f.endswith('.so'):
                    total_so_count += 1
                    fp = os.path.join(root, f)
                    with open(fp, 'rb+') as file:
                        data = file.read()
                        if data[:4] == b'\x7fELF':
                            is_64 = (data[4] == 2)
                            e_phoff = struct.unpack('<Q' if is_64 else '<I', data[32:40] if is_64 else data[28:32])[0]
                            e_phentsize = struct.unpack('<H', data[54:56] if is_64 else data[42:44])[0]
                            e_phnum = struct.unpack('<H', data[56:58] if is_64 else data[44:46])[0]
                            
                            file_modified = False
                            for i in range(e_phnum):
                                off = e_phoff + i * e_phentsize
                                if is_64:
                                    p_type, p_flags, p_offset, p_vaddr, p_paddr, p_filesz, p_memsz, p_align = struct.unpack('<IIQQQQQQ', data[off:off+56])
                                    if p_type == 1 and p_align < 16384: # PT_LOAD
                                        file.seek(off + 48)
                                        file.write(struct.pack('<Q', 16384))
                                        file_modified = True
                                else:
                                    p_type, p_offset, p_vaddr, p_paddr, p_filesz, p_memsz, p_flags, p_align = struct.unpack('<IIIIIIII', data[off:off+32])
                                    if p_type == 1 and p_align < 16384: # PT_LOAD
                                        file.seek(off + 28)
                                        file.write(struct.pack('<I', 16384))
                                        file_modified = True
                            if file_modified:
                                patched_count += 1

        print(f"[*] Patched {patched_count}/{total_so_count} .so files to 16 KB (0x4000) alignment.")

        # 3. Remove old signatures if present
        meta_inf_dir = os.path.join(temp_dir, 'META-INF')
        if os.path.exists(meta_inf_dir):
            for item in os.listdir(meta_inf_dir):
                if item.endswith(('.SF', '.RSA', '.DSA', '.EC')) or item == 'MANIFEST.MF':
                    os.remove(os.path.join(meta_inf_dir, item))

        # 4. Re-zip AAB
        with zipfile.ZipFile(patched_aab, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for root, dirs, files in os.walk(temp_dir):
                for f in files:
                    full_p = os.path.join(root, f)
                    rel_p = os.path.relpath(full_p, temp_dir)
                    zout.write(full_p, rel_p)

        # Replace original AAB
        os.replace(patched_aab, aab_path)
        print(f"[*] Re-packaged AAB at {aab_path}")

        # 5. Sign AAB using jarsigner
        if keystore_path and os.path.exists(keystore_path):
            jarsigner_bin = "jarsigner"
            # Look for jarsigner in JAVA_HOME if set
            java_home = os.environ.get("JAVA_HOME")
            if java_home:
                candidate = os.path.join(java_home, "bin", "jarsigner.exe" if os.name == 'nt' else "jarsigner")
                if os.path.exists(candidate):
                    jarsigner_bin = candidate

            sign_cmd = [
                jarsigner_bin,
                "-keystore", keystore_path,
                "-storepass", store_pass,
                "-keypass", key_pass,
                "-digestalg", "SHA-256",
                "-sigalg", "SHA256withRSA",
                aab_path,
                key_alias
            ]
            print(f"[*] Signing AAB with jarsigner...")
            res = subprocess.run(sign_cmd, capture_output=True, text=True)
            if res.returncode == 0:
                print("[OK] Successfully signed 16 KB aligned AAB bundle!")
            else:
                print(f"[!] Jarsigner failed:\n{res.stderr}\n{res.stdout}")
                sys.exit(1)
        else:
            print("[!] Keystore not provided or found, skipping signing.")

    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

if __name__ == '__main__':
    aab = sys.argv[1] if len(sys.argv) > 1 else r"mobile/android/app/build/outputs/bundle/release/app-release.aab"
    ks = sys.argv[2] if len(sys.argv) > 2 else r"mobile/android/app/my-upload-key.keystore"
    alias = sys.argv[3] if len(sys.argv) > 3 else "my-key-alias"
    spass = sys.argv[4] if len(sys.argv) > 4 else "PlowPathSecureKey_9fK8wN1sQ4zD7xM0aP2c"
    kpass = sys.argv[5] if len(sys.argv) > 5 else "PlowPathSecureKey_9fK8wN1sQ4zD7xM0aP2c"

    patch_16kb_alignment(aab, ks, alias, spass, kpass)
