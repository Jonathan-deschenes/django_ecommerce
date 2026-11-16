import django_filters
from .models import Product


class ProductPriceFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(
        field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(
        field_name='price', lookup_expr='lte')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    min_rating = django_filters.NumberFilter(
        field_name='stars', lookup_expr='gte')
    max_rating = django_filters.NumberFilter(
        field_name='stars', lookup_expr='lte')

    class Meta:
        model = Product
        fields = ['min_price', 'max_price', 'is_active', 'categories']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gte=1)
        return queryset.filter(stock__lte=0)
