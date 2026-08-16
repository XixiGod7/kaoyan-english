import os
import shutil
import subprocess
import stat

def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def deploy_to_gh_pages():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_dir = os.path.join(root, 'temp_gh_pages')
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, onexc=lambda func, path, exc: (os.chmod(path, stat.S_IWRITE), func(path)))
    os.makedirs(temp_dir, exist_ok=True)

    # 1. Copy dist/index.html
    shutil.copy2(os.path.join(root, 'dist', 'index.html'), os.path.join(temp_dir, 'index.html'))

    # 2. Copy 404.html for SPA routing fallback
    shutil.copy2(os.path.join(root, 'dist', 'index.html'), os.path.join(temp_dir, '404.html'))

    # 3. Copy .nojekyll
    with open(os.path.join(temp_dir, '.nojekyll'), 'w') as f:
        f.write('')

    # 4. Copy public folders: data, icons, images, thumbs, sw.js
    pub_dir = os.path.join(root, 'public')
    for item in ['data', 'icons', 'images', 'thumbs']:
        src = os.path.join(pub_dir, item)
        if os.path.exists(src):
            shutil.copytree(src, os.path.join(temp_dir, item))

    if os.path.exists(os.path.join(pub_dir, 'sw.js')):
        shutil.copy2(os.path.join(pub_dir, 'sw.js'), os.path.join(temp_dir, 'sw.js'))

    # 5. Git commit & push to gh-pages branch
    try:
        # Initialize a new git repo in temp_dir
        subprocess.run(['git', 'init'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'config', 'user.name', 'XixiGod7'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'config', 'user.email', 'cxmxibing@gmail.com'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'checkout', '-b', 'gh-pages'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'add', '-A'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'commit', '-m', 'deploy: deploy PWA to gh-pages'], cwd=temp_dir, check=True)

        token = subprocess.check_output(['gh', 'auth', 'token'], text=True).strip()
        remote_url = f"https://x-access-token:{token}@github.com/XixiGod7/kaoyan-english.git"
        
        env = os.environ.copy()
        env['HTTP_PROXY'] = 'http://127.0.0.1:7890'
        env['HTTPS_PROXY'] = 'http://127.0.0.1:7890'

        subprocess.run(['git', '-c', 'http.proxy=http://127.0.0.1:7890', 'push', '-f', remote_url, 'gh-pages'], cwd=temp_dir, check=True, env=env)
        print("Successfully deployed to gh-pages branch!")
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == '__main__':
    deploy_to_gh_pages()
