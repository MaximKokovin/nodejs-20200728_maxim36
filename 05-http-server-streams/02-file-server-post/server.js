const url = require('url');
const http = require('http');
const path = require('path');
const fs = require('fs');
const LimitSizeStream = require('./LimitSizeStream');

const server = new http.Server();

const hasFile = (filepath) => {
  return new Promise((resolve) => {
    fs.access(filepath, (err) => {
      if (err) resolve(false);
      else resolve(true);
    })
  })
}

const handlers = {
  async POST(req, res, filepath) {
    const fileExist = await hasFile(filepath);

    if (fileExist) {
      res.statusCode = 409;
      res.end('Conflict');
      return;
    };

    const fileSizeControl = new LimitSizeStream({limit: 10 ** 6});
    const writableStream = fs.createWriteStream(filepath);

    req.pipe(fileSizeControl).pipe(writableStream);

    writableStream.on('finish', () => {
      res.statusCode = 201;
      res.end();
    });

    writableStream.on('error', (err) => {
      fileSizeControl.destroy();
      fs.unlink(filepath, (err) => {
        res.statusCode = 500;
        res.end('Server error');
      })
    });

    req.on('close', () => {
      fileSizeControl.destroy();
      if (res.writableFinished) return;
      writableStream.destroy();
      fs.unlink(filepath, (err) => {
        res.end('Connetction closed');
      })
    })

    fileSizeControl.on('error', (err) => {
      fileSizeControl.destroy();
      writableStream.destroy();
      fs.unlink(filepath, (err) => {
        if (err) {
          res.statusCode = 500;
          res.end('Server error');
        } else {
          res.statusCode = 413;
          res.end('Payload too large');
        }
      })
    });
  }
}

server.on('request', (req, res) => {
  const pathname = url.parse(req.url).pathname.slice(1);

  if (pathname.indexOf('/') !== -1) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  };

  const filepath = path.join(__dirname, 'files', pathname);

  const handler = handlers[req.method];
  if (handler) {
    handler(req, res, filepath);
  } else {
    res.statusCode = 501;
    res.end('Not implemented');
  }
});

module.exports = server;
