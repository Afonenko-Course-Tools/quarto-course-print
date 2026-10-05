"""Real complete source payload -> quarto add -> installed-only CLI and PDF checks."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def run(args, **kw):
    process = subprocess.run(args, text=True, capture_output=True, **kw)
    if process.returncode:
        raise RuntimeError(f"Command failed: {args}\n{process.stdout}\n{process.stderr}")
    return process.stdout


def tree(root):
    # Keep lexical paths: resolving here would conceal a link to the checkout.
    root = root.absolute()
    for path in (root, *root.parents):
        assert not path.is_symlink(), f"symlink in installed path: {path}"
    result = {}
    for p in root.rglob('*'):
        assert not p.is_symlink(), f"symlink in installed file: {p}"
        if p.is_file():
            result[str(p.relative_to(root))] = p.read_bytes()
    return result


def isolated_command(command, env):
    # Reset sudo environment from the selected UID passwd entry before explicit tool paths.
    return ['sudo', 'unshare', '--net', '--', 'setpriv', f'--reuid={os.getuid()}',
            f'--regid={os.getgid()}', '--clear-groups', '--reset-env', 'env', f'PATH={env["PATH"]}',
            f'DENO_DIR={env["DENO_DIR"]}', 'DENO_NO_UPDATE_CHECK=1', *command]


def check(repo, package):
    with tempfile.TemporaryDirectory(prefix='print-installed-') as directory:
        stage = Path(directory).resolve()
        source, consumer = stage/'source', stage/'consumer'
        source.mkdir(); consumer.mkdir()
        shutil.copytree(repo/'_extensions',source/'_extensions')
        run(['quarto', 'add', str(source), '--no-prompt'], cwd=consumer)
        installed = consumer/'_extensions/course-print'
        assert tree(source/'_extensions/course-print') == tree(installed), 'installed bytes differ'
        assert not list(consumer.rglob('node_modules'))
        shutil.copyfile(package, consumer/'package.json')
        payload = json.loads(package.read_text())
        (consumer/'header.json').write_text('{"group":"Installed", "date":"2026-10-01"}\n')
        env = dict(os.environ, DENO_DIR=str(consumer/'deno-cache'), DENO_NO_UPDATE_CHECK='1')
        cmd = ['deno', 'run', '--no-config', '--no-lock', '--no-npm', '--cached-only', '--deny-net',
               f'--allow-read={consumer}', f'--deny-read={repo},{source}', f'--allow-write={consumer}',
               '--allow-run=quarto', '--allow-env', str(installed/'entrypoints/export.ts'),
               'package.json', 'course-a/sec-work-one', 'output', 'header.json']
        if os.environ.get('PRINT_REQUIRE_NETWORK_ISOLATION') == '1':
            cmd = isolated_command(cmd, env)
        result = json.loads(run(cmd, cwd=consumer, env=env))
        assert result['status'] == 'built' and result['engineCalls'] == 2
        text = run(['pdftotext', str(consumer/'output/handout.pdf'), '-'])
        condition = 'TLS'
        for token in [condition, 'Installed', 'Name', '2026-10-01']:
            assert token in text, token
        for secret in ['TEACHER_SECRET', 'GRADING_SECRET', 'closedKey']:
            assert secret not in text, secret
        for resource in payload['resources']:
            output = consumer/'output'/resource['target']
            assert hashlib.sha256(output.read_bytes()).hexdigest() == resource['sha256']
        original = (consumer/'output/handout.pdf').read_bytes()
        # Failed transport integrity is refused before compiler writes.
        damaged = dict(payload)
        damaged['resources'] = [dict(r, sha256='0'*64) for r in payload['resources']]
        (consumer/'package.json').write_text(json.dumps(damaged))
        failed = subprocess.run(cmd, cwd=consumer, env=env, capture_output=True, text=True)
        assert failed.returncode and 'hash mismatch' in failed.stderr
        assert (consumer/'output/handout.pdf').read_bytes() == original
        assert not list(consumer.glob('.course-print-attempt-*'))
        assert not list(consumer.rglob('node_modules'))
    print('PASS: complete payload, exact installed assets, no dev reads/imports, real PDF/resources, failure keeps old artifact; input ' + str(payload.get('schema', payload.get('experimental'))))


if __name__ == '__main__':
    check(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
