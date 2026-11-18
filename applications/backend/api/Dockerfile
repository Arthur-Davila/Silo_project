FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY storage.py api.py ./

RUN useradd --system --uid 10001 app \
    && mkdir -p /data \
    && chown -R app:app /app /data

USER app

EXPOSE 3001

CMD ["python", "api.py"]
