import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Product } from '../api/types'
import { CategoryBreadcrumb, CategoryPath } from '../components/CategoryBreadcrumb'
import { ProductImage } from '../components/ProductImage'
import { RatingStars } from '../components/RatingStars'
import { ReviewList } from '../components/ReviewList'
import { EmptyState, ErrorState, PageLoading } from '../components/States'
import { ArrowLeftIcon } from '../components/icons'
import { useProduct } from '../contexts/ProductContext'
import {
  formatPrice,
  formatReviewCount,
  formatDate,
} from '../lib/format'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { fetchProduct } = useProduct()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let active = true

    if (!productId) {
      setProduct(null)
      setError('Identifiant produit invalide.')
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)
    setError(null)
    setProduct(null)

    fetchProduct(productId)
      .then((nextProduct) => {
        if (!active) return
        setProduct(nextProduct)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(
          cause instanceof Error
            ? cause.message
            : 'Impossible de charger ce produit pour le moment.',
        )
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchProduct, productId, reloadToken])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PageLoading label="Chargement du produit…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState
          title="Produit introuvable"
          message={error}
          onRetry={() => setReloadToken((token) => token + 1)}
        />
        <div className="mt-6 text-center">
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeftIcon />
            Retour au catalogue
          </Link>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState
          title="Produit introuvable"
          message="Ce produit n’existe pas ou n’est plus disponible."
          action={
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <ArrowLeftIcon />
              Retour au catalogue
            </Link>
          }
        />
      </div>
    )
  }

  const parsedStars = Number.parseFloat(product.stars)
  const rating = Number.isFinite(parsedStars) ? parsedStars : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <CategoryBreadcrumb
        category={product.categories[0]}
        trailing={product.name}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductImage
          product={product}
          className="aspect-square w-full rounded-3xl shadow-sm"
        />

        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              {product.categories.length > 0 ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {product.categories.length > 1 ? 'Catégories' : 'Catégorie'}
                  </p>
                  <div className="space-y-1">
                    {product.categories.map((category) => (
                      <CategoryPath
                        key={category.id}
                        category={category}
                        lastAsCurrent={false}
                        className="flex flex-wrap items-center gap-1 text-xs font-semibold"
                        linkClassName="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 transition hover:bg-indigo-100"
                        currentClassName="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800"
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                product.is_active && product.stock > 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {!product.is_active
                ? 'Indisponible'
                : product.stock > 0
                  ? `En stock (${product.stock})`
                  : 'Rupture de stock'}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <RatingStars rating={rating} />
            <span className="text-sm text-slate-500">
              {rating.toFixed(1)} / 5 · {formatReviewCount(product.reviews.length)}
            </span>
          </div>

          <p className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
            {formatPrice(product.price)}
          </p>

          <p className="mt-6 text-xs text-slate-400">
            Ajouté au catalogue le {formatDate(product.created_at)}
          </p>
        </div>
      </div>

      <ReviewList reviews={product.reviews} rating={rating} />
    </div>
  )
}
