import Dockerode from 'dockerode';
import { Writable } from 'stream';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  wallTimeMs: number;
  timedOut: boolean;
  oomKilled: boolean;
}

const MAX_OUTPUT_BYTES = 21000;

const docker = new Dockerode();

export class ContainerRunner {
  private readonly image: string;
  private readonly memoryLimitMb: number;
  private readonly cpus: string;
  private containerId: string | null = null;

  constructor(image: string, memoryLimitMb: number, cpus: string) {
    this.image = image;
    this.memoryLimitMb = memoryLimitMb;
    this.cpus = cpus;
  }

  async start(sourceFile: string, sourceCode: string): Promise<void> {
    const container = await docker.createContainer({
      Image: this.image,
      Cmd: ['sh', '-c', 'while true; do sleep 86400; done'],
      WorkingDir: '/work',
      NetworkDisabled: true,
      User: '1000:1000',
      HostConfig: {
        Memory: this.memoryLimitMb * 1024 * 1024,
        MemorySwap: this.memoryLimitMb * 1024 * 1024,
        NanoCpus: Math.round(parseFloat(this.cpus) * 1e9),
        PidsLimit: 128,
        ReadonlyRootfs: false,
        Tmpfs: { '/work': 'rw,exec,size=128m,uid=1000,gid=1000' },
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges'],
        AutoRemove: true,
        Ulimits: [
          { Name: 'nofile', Soft: 64, Hard: 64 },
          { Name: 'fsize', Soft: 64 * 1024 * 1024, Hard: 64 * 1024 * 1024 },
        ],
      },
      Tty: false,
      OpenStdin: false,
      AttachStdin: false,
      AttachStdout: false,
      AttachStderr: false,
    });

    this.containerId = container.id;
    await container.start();

    const codeB64 = Buffer.from(sourceCode, 'utf-8').toString('base64');
    const writeRes = await this.execRaw(
      ['sh', '-c', `echo "${codeB64}" | base64 -d > /work/${sourceFile}`],
      5000,
    );
    if (writeRes.exitCode !== 0) {
      throw new Error(`Failed to write source: ${writeRes.stderr}`);
    }
  }

  async exec(cmd: string[], stdin: string, timeLimitMs: number): Promise<RunResult> {
    if (!this.containerId) throw new Error('Container not started');

    if (stdin.length === 0) {
      return this.execRaw(cmd, timeLimitMs);
    }

    const inputB64 = Buffer.from(stdin, 'utf-8').toString('base64');
    const cmdStr = cmd.map((s) => `'${s.replace(/'/g, `'"'"'`)}'`).join(' ');
    const wrapped = ['sh', '-c', `echo "${inputB64}" | base64 -d | ${cmdStr}`];
    return this.execRaw(wrapped, timeLimitMs);
  }

  private async execRaw(cmd: string[], timeLimitMs: number): Promise<RunResult> {
    if (!this.containerId) throw new Error('Container not started');
    const container = docker.getContainer(this.containerId);

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;

    const stdoutStream = new Writable({
      write(chunk: Buffer, _encoding, cb) {
        stdoutBytes += chunk.length;
        if (stdoutBytes <= MAX_OUTPUT_BYTES) stdoutChunks.push(chunk);
        cb();
      },
    });
    const stderrStream = new Writable({
      write(chunk: Buffer, _encoding, cb) {
        stderrBytes += chunk.length;
        if (stderrBytes <= MAX_OUTPUT_BYTES) stderrChunks.push(chunk);
        cb();
      },
    });

    const demuxed = new Promise<void>((resolve, reject) => {
      docker.modem.demuxStream(stream, stdoutStream, stderrStream);
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const startMs = Date.now();

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      stream.destroy();
    }, timeLimitMs);

    try {
      await demuxed;
    } catch {
      // stream destroyed on timeout — expected
    } finally {
      clearTimeout(timeout);
    }

    const wallTimeMs = Date.now() - startMs;
    const inspect = await exec.inspect();
    const exitCode: number = inspect.ExitCode ?? 1;

    const oomKilled = await this.isOomKilled();

    return {
      stdout: Buffer.concat(stdoutChunks).toString('utf-8').slice(0, 20000),
      stderr: Buffer.concat(stderrChunks).toString('utf-8').slice(0, 10000),
      exitCode,
      wallTimeMs,
      timedOut,
      oomKilled,
    };
  }

  private async isOomKilled(): Promise<boolean> {
    if (!this.containerId) return false;
    try {
      const info = await docker.getContainer(this.containerId).inspect();
      return info.State?.OOMKilled ?? false;
    } catch {
      return false;
    }
  }

  async remove(): Promise<void> {
    if (!this.containerId) return;
    try {
      await docker.getContainer(this.containerId).remove({ force: true });
    } catch {
      // already removed by AutoRemove or does not exist
    }
    this.containerId = null;
  }
}

export async function removeOrphanedContainers(labelPrefix: string): Promise<void> {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({ label: [`executor-prefix=${labelPrefix}`] }),
    });
    await Promise.all(
      containers.map((c) =>
        docker
          .getContainer(c.Id)
          .remove({ force: true })
          .catch(() => {}),
      ),
    );
  } catch {
    // non-fatal
  }
}
