FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./

# Long polling makes the outbound connections itself, so no port is exposed
# unless you set PORT (see .env.example).
CMD ["python", "bot.py"]
