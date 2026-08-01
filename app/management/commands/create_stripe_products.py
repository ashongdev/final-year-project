"""
One-off setup: creates the Stripe Products/Prices for genC's paid tier and
prints the resulting Price IDs to paste into the environment. Safe to run
against a fresh Stripe account (test or live); running it again will create
duplicate Products, so it's meant to be run once per account.
"""
import stripe
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates the genC Pro subscription and credit pack Products/Prices in Stripe."

    def handle(self, *args, **options):
        if not settings.STRIPE_SECRET_KEY:
            self.stderr.write("STRIPE_SECRET_KEY is not set in the environment.")
            return

        stripe.api_key = settings.STRIPE_SECRET_KEY

        pro_product = stripe.Product.create(
            name="genC Pro",
            description=(
                "Unlocks the advanced editor, unlimited templates, unlimited "
                "batch generation, recipient access control, unlimited "
                "redownloads, and full analytics."
            ),
        )

        monthly_price = stripe.Price.create(
            product=pro_product.id,
            unit_amount=499,
            currency="usd",
            recurring={"interval": "month"},
            nickname="genC Pro - Monthly",
        )

        annual_price = stripe.Price.create(
            product=pro_product.id,
            unit_amount=4999,
            currency="usd",
            recurring={"interval": "year"},
            nickname="genC Pro - Annual",
        )

        credit_product = stripe.Product.create(
            name=f"genC Credit Pack ({settings.CREDIT_PACK_SIZE} certificates)",
            description=(
                "A one-time, non-expiring allotment of certificate credits "
                "for batch generation beyond the free tier's cap."
            ),
        )

        credit_price = stripe.Price.create(
            product=credit_product.id,
            unit_amount=1999,
            currency="usd",
            nickname="genC Credit Pack",
        )

        self.stdout.write(
            self.style.SUCCESS("Created Stripe Products/Prices. Add these to your .env:\n")
        )
        self.stdout.write(f"STRIPE_PRICE_MONTHLY={monthly_price.id}")
        self.stdout.write(f"STRIPE_PRICE_ANNUAL={annual_price.id}")
        self.stdout.write(f"STRIPE_PRICE_CREDIT_PACK={credit_price.id}")
