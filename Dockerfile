# از Node رسمی استفاده می‌کنیم
FROM node:20

# دایرکتوری کاری داخل کانتینر
WORKDIR /app

# کپی پکیج‌ها
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm install

# کپی کل پروژه (شامل server/ و client/)
COPY . .

# باز کردن پورت مورد نظر (اختیاری ولی مفید برای مستندسازی)
EXPOSE 3000

# اجرای برنامه
CMD ["npm", "start"]
