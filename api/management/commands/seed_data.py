import random
import traceback
from datetime import datetime, timedelta
from decimal import Decimal

import pandas as pd
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from faker import Faker

from api.models import *

faker = Faker()
User = get_user_model()


def to_decimal(value):
    if pd.isna(value):
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"))


class Command(BaseCommand):
    help = "Seed the database"

    def log(self, text, tag="INFO", k=-1, n=-1):
        styles = {
            "INFO": None,
            "SUCCESS": self.style.SUCCESS,
            "WARNING": self.style.WARNING,
            "ERROR": self.style.ERROR,
        }
        style = styles.get(tag.upper())
        count = f"{k + 1}/{n}" if k != -1 and n != -1 else ""
        line = f"{datetime.now()} [{tag.upper()}] {text} {count}"
        self.stdout.write(style(line) if style else line)

    def progress(self, text, k, n, step=5_000):
        """Log only every `step` items (and on the last one)."""
        if (k + 1) % step == 0 or k + 1 == n:
            self.log(text, k=k, n=n)

    def handle(self, *args, **options):
        try:
            self.seed()   # no global transaction: each batch commits on its own
        except Exception as e:
            self.log(f"An unexpected error occured: {e}", "error")
            traceback.print_exc()

    def seed(self):
        AMOUNT_SEEDING = 2_000_000
        BATCH = 5_000
        CSV = "data/amz_ca_total_products_data_processed.csv"

        # 1. Categories (read only that one column)
        self.log("Starting Category seeding...")
        names = pd.read_csv(CSV, usecols=["categoryName"])[
            "categoryName"].dropna().unique()
        seen, temp_categories = set(), []
        for name in names:
            slug = slugify(name)
            if slug not in seen:
                seen.add(slug)
                temp_categories.append(Category(name=name, slug=slug))
        Category.objects.bulk_create(
            temp_categories, batch_size=BATCH, ignore_conflicts=True)
        cat_by_slug = {
            c.slug: c.pk for c in Category.objects.filter(slug__in=seen)}

        # 2. Users (200k, inserted batch by batch)
        self.log("Starting User seeding...")
        hashed = make_password("test1234")
        userLength = AMOUNT_SEEDING // 10
        user_ids = []
        for start in range(0, userLength, BATCH):
            batch = [
                User(
                    username=f"{faker.user_name()}_{i}",
                    first_name=faker.first_name(),
                    last_name=faker.last_name(),
                    email=f"user{i}@example.com",
                    password=hashed,
                )
                for i in range(start, min(start + BATCH, userLength))
            ]
            with transaction.atomic():
                created = User.objects.bulk_create(batch)
            user_ids.extend(u.pk for u in created)
            self.log("seeding users", k=min(
                start + BATCH, userLength) - 1, n=userLength)

        # 3. Products + category links, one CSV chunk at a time
        self.log("Starting Product seeding...")
        CatThrough = Product.categories.through
        product_ids = []
        done = 0
        for chunk in pd.read_csv(CSV, nrows=AMOUNT_SEEDING, chunksize=BATCH):
            chunk = chunk.dropna(
                subset=["asin", "title"]).drop_duplicates("asin")

            products, links = [], []
            for row in chunk.itertuples():
                products.append(Product(
                    id=row.asin,
                    name=row.title,
                    image=row.imgUrl,
                    stars=None if pd.isna(row.stars) else float(row.stars),
                    price=to_decimal(row.price),
                    stock=random.randint(0, 1000),
                ))
                if not pd.isna(row.categoryName):
                    links.append(CatThrough(
                        product_id=row.asin,
                        category_id=cat_by_slug[slugify(row.categoryName)],
                    ))
                product_ids.append(row.asin)

            with transaction.atomic():
                Product.objects.bulk_create(products, ignore_conflicts=True)
                CatThrough.objects.bulk_create(links, ignore_conflicts=True)

            done += len(chunk)
            self.log(f"seeding products ({done} rows)")

        # 4. Reviews (4M, built and inserted 5,000 at a time)
        self.log("Starting Review seeding...")
        reviewLength = AMOUNT_SEEDING * 2
        comment_pool = [faker.text(max_nb_chars=random.randint(
            300, 1000)) for _ in range(1_000)]
        now = timezone.now()
        five_years = 5 * 365 * 24 * 3600

        for start in range(0, reviewLength, BATCH):
            size = min(BATCH, reviewLength - start)
            batch = [
                Review(
                    rating=random.randint(1, 5),
                    comment=random.choice(comment_pool),
                    created_at=now -
                    timedelta(seconds=random.randint(0, five_years)),
                    user_id=random.choice(user_ids),
                    product_id=random.choice(product_ids),
                )
                for _ in range(size)
            ]
            with transaction.atomic():
                Review.objects.bulk_create(batch)
            if (start // BATCH) % 20 == 0:
                self.log("seeding reviews", k=start + size - 1, n=reviewLength)

        # # 7. Order seeding

        # # Logging
        # self.log("Starting Order seeding...")

        # tempOrder = []
        # orderLength = 500

        # for i in range(orderLength):
        #     # Logging
        #     self.log("seeding orders", k=i, n=orderLength)

        #     order = Order(
        #         user=random.choice(users)
        #     )
        #     tempOrder.append(order)

        # orders = Order.objects.bulk_create(tempOrder)

        # # 8. OrderItem seeding

        # # Logging
        # self.log("Starting OrderItem seeding...")

        # tempOrderItem = []
        # orderItemLength = 1000

        # for i in range(orderItemLength):
        #     # Logging
        #     self.log("seeding items to orders", k=i, n=orderItemLength)

        #     product = random.choice(products)

        #     orderItem = OrderItem(
        #         order=random.choice(orders),
        #         quantity=random.randint(1, 10),
        #         product=product,
        #         unit_price=product.price
        #     )
        #     tempOrderItem.append(orderItem)

        # orderItems = OrderItem.objects.bulk_create(tempOrderItem)

        self.log("Database has been seeded successfully", "success")
