document.addEventListener('DOMContentLoaded', () => {
    
    // === LOGIC LOGIN ===
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const errorAlert = document.getElementById('errorAlert');
            const btn = document.getElementById('loginBtn');

            // UI Loading State
            const originalBtnText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memproses...';
            btn.disabled = true;
            errorAlert.classList.add('d-none');

            try {
                // Panggil API (URL dari config.js)
                const res = await fetch(`${CONFIG.API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                const data = await res.json();

                if (res.ok) {
                    // Simpan Token & Identitas
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('role', data.role);
                    
                    // Fallback kalau username gak dikirim backend
                    localStorage.setItem('username', data.username || usernameInput); 

                    // Redirect sesuai Role
                    if (data.role === 'admin') {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "index.html";
                    }
                } else {
                    throw new Error(data.detail || "Login Gagal");
                }

            } catch (error) {
                console.error(error);
                errorAlert.innerText = error.message || "Gagal terhubung ke server.";
                errorAlert.classList.remove('d-none');
                
                // Animasi Shake kalau error (opsional, biar keren dikit)
                loginForm.classList.add('shake');
                setTimeout(() => loginForm.classList.remove('shake'), 500);

            } finally {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }
        });
    }

    // === LOGIC REGISTER (AKAN DATANG) ===
// ... (Kode Login yang sebelumnya ada di atas sini biarkan saja) ...

    // === LOGIC REGISTER ===
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const secretCodeInput = document.getElementById('secret_code').value;
            const alertBox = document.getElementById('alertBox');
            const btn = document.getElementById('regBtn');

            // UI Loading State
            const originalBtnText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mendaftarkan...';
            btn.disabled = true;
            alertBox.classList.add('d-none');
            alertBox.classList.remove('alert-success', 'alert-danger');

            try {
                const res = await fetch(`${CONFIG.API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: usernameInput,
                        password: passwordInput,
                        secret_code: secretCodeInput // Wajib dikirim
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    // Sukses
                    alertBox.innerText = "Registrasi Berhasil! Mengalihkan ke Login...";
                    alertBox.classList.add('alert-success');
                    alertBox.classList.remove('d-none');
                    
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1500);
                } else {
                    throw new Error(data.detail || "Registrasi Gagal");
                }

            } catch (error) {
                console.error(error);
                alertBox.innerText = error.message || "Gagal terhubung ke server.";
                alertBox.classList.add('alert-danger');
                alertBox.classList.remove('d-none');
                
                // Efek visual error
                registerForm.classList.add('shake');
                setTimeout(() => registerForm.classList.remove('shake'), 500);

            } finally {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }
        });
    }

});