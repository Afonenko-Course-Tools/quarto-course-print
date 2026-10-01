"""Exercise the actual setpriv stage; full namespace entry remains a CI gate."""
import json
import os
import pwd
import subprocess
import sys
import unittest
from installed_check import isolated_command


class IsolatedEnvironment(unittest.TestCase):
    def test_selected_user_environment_is_reset_and_explicit_tool_paths_survive(self):
        env = dict(os.environ, PRINT_INHERITED_ENV_PROBE='must be cleared',
                   DENO_DIR='/tmp/print-environment-probe-cache')
        probe = [sys.executable, '-c',
                 "import json,os; keys=('PRINT_INHERITED_ENV_PROBE','HOME','USER','LOGNAME',"
                 "'SHELL','PATH','DENO_DIR','DENO_NO_UPDATE_CHECK'); "
                 "print(json.dumps({k:os.environ[k] for k in keys if k in os.environ}))"]
        command = isolated_command(probe, env)
        self.assertEqual(command[:4], ['sudo', 'unshare', '--net', '--'])
        self.assertIn(f'--reuid={os.getuid()}', command)
        self.assertIn(f'--regid={os.getgid()}', command)
        self.assertIn('--clear-groups', command)
        # Local focused environment check only: no UID/group or namespace syscall.
        # The installed CI continues to execute the entire mandatory command.
        environment_command = [arg for arg in command[4:]
                               if not arg.startswith(('--reuid=', '--regid='))
                               and arg != '--clear-groups']
        result = subprocess.run(environment_command, env=env, text=True,
                                capture_output=True, check=True)
        actual = json.loads(result.stdout)
        self.assertNotIn('PRINT_INHERITED_ENV_PROBE', actual)
        user = pwd.getpwuid(os.getuid())
        self.assertEqual(actual['HOME'], user.pw_dir)
        self.assertEqual(actual['USER'], user.pw_name)
        self.assertEqual(actual['LOGNAME'], user.pw_name)
        self.assertEqual(actual['SHELL'], user.pw_shell or '/bin/sh')
        self.assertEqual(actual['PATH'], env['PATH'])
        self.assertEqual(actual['DENO_DIR'], env['DENO_DIR'])
        self.assertEqual(actual['DENO_NO_UPDATE_CHECK'], '1')
