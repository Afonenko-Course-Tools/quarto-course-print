import shutil
import tempfile
import unittest
from pathlib import Path
from installed_check import tree


class InstalledBytes(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name).resolve()
        self.source = self.root/'source'
        self.source.mkdir()
        (self.source/'entry.ts').write_text('standalone source')

    def tearDown(self):
        self.tmp.cleanup()

    def test_real_bytes_are_read(self):
        self.assertEqual(tree(self.source), {'entry.ts': b'standalone source'})

    def test_root_symlink_is_rejected(self):
        alias = self.root/'installed'
        alias.symlink_to(self.source, target_is_directory=True)
        with self.assertRaisesRegex(AssertionError, 'symlink'):
            tree(alias)

    def test_ancestor_symlink_is_rejected(self):
        alias = self.root/'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(AssertionError, 'symlink'):
            tree(alias/'source')

    def test_nested_symlink_is_rejected(self):
        (self.source/'link.ts').symlink_to(self.source/'entry.ts')
        with self.assertRaisesRegex(AssertionError, 'symlink'):
            tree(self.source)
