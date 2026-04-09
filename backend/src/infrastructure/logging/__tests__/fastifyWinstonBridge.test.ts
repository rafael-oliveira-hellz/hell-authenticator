import { fastifyWinstonBridge, createFastifyWinstonStream } from '../fastifyWinstonBridge';
import { winstonLogger } from '../winstonLogger';

describe('fastifyWinstonBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps pino levels to winston levels', () => {
    expect(fastifyWinstonBridge.mapPinoLevel(10)).toBe('debug');
    expect(fastifyWinstonBridge.mapPinoLevel(30)).toBe('info');
    expect(fastifyWinstonBridge.mapPinoLevel(40)).toBe('warn');
    expect(fastifyWinstonBridge.mapPinoLevel(50)).toBe('error');
    expect(fastifyWinstonBridge.mapPinoLevel('bad')).toBe('info');
  });

  it('forwards parsed pino line to winston', () => {
    const logSpy = jest.spyOn(winstonLogger, 'log').mockImplementation(() => winstonLogger);

    fastifyWinstonBridge.forwardPinoLine(JSON.stringify({
      level: 30,
      msg: 'incoming request',
      reqId: 'req-1'
    }));

    expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
      level: 'info',
      message: 'incoming request',
      meta: expect.objectContaining({ reqId: 'req-1' })
    }));
  });

  it('forwards non-json line as info message', () => {
    const logSpy = jest.spyOn(winstonLogger, 'log').mockImplementation(() => winstonLogger);

    fastifyWinstonBridge.forwardPinoLine('plain text line');

    expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
      level: 'info',
      message: 'plain text line'
    }));
  });

  it('writes chunk with multiple lines through stream', () => {
    const logSpy = jest.spyOn(winstonLogger, 'log').mockImplementation(() => winstonLogger);
    const stream = createFastifyWinstonStream();

    stream.write(`${JSON.stringify({ level: 30, msg: 'line1' })}\n${JSON.stringify({ level: 40, msg: 'line2' })}\n`);

    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});
