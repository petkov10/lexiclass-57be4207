FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./

RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun install; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]