import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { listAllCategories } from '../api/client'
import type { Category } from '../api/types'
import { buildCategoryTree, type CategoryTreeNode } from '../lib/categoryTree'

interface TaxonomyContextValue {
  categories: Category[]
  categoryById: Map<number, Category>
  categoryTree: CategoryTreeNode[]
  loading: boolean
  error: string | null
  reload: () => void
}

const TaxonomyContext = createContext<TaxonomyContextValue | null>(null)

export function TaxonomyProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    listAllCategories(controller.signal)
      .then((nextCategories) => {
        setCategories(nextCategories)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return

        setError(
          cause instanceof Error
            ? cause.message
            : 'Impossible de charger les catégories.',
        )
        setLoading(false)
      })

    return () => controller.abort()
  }, [reloadToken])

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  )

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const value = useMemo<TaxonomyContextValue>(
    () => ({
      categories,
      categoryById,
      categoryTree,
      loading,
      error,
      reload,
    }),
    [
      categories,
      categoryById,
      categoryTree,
      error,
      loading,
      reload,
    ],
  )

  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>
}

export function useTaxonomy(): TaxonomyContextValue {
  const context = useContext(TaxonomyContext)

  if (!context) {
    throw new Error('useTaxonomy doit être utilisé dans un TaxonomyProvider.')
  }

  return context
}
