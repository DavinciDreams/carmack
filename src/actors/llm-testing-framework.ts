import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fromPromise } from 'xstate';
import { z } from 'zod';
