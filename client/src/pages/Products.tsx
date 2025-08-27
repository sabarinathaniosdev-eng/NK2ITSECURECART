import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ProductCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X } from 'lucide-react';
import { type Product } from '@shared/schema';

export default function Products() {
  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ['api', 'products'],
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Symantec Security Products</h1>
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {[1, 2].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-32 bg-gray-200">
                <Skeleton className="w-full h-full" />
              </div>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-8 w-20 mb-4" />
                <div className="space-y-2 mb-6">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Products</h1>
        <p className="text-red-600">Failed to load products. Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Symantec Security Products</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Showing {products?.length || 0} products
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Product Comparison */}
      <Card className="mt-12">
        <CardContent className="p-8">
          <h3 className="text-2xl font-bold mb-6">Product Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="comparison-table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Endpoint Protection</th>
                  <th className="text-center py-3 px-4">Endpoint Security Complete</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Malware Protection</td>
                  <td className="text-center py-3 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Firewall & Network Protection</td>
                  <td className="text-center py-3 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Endpoint Detection & Response</td>
                  <td className="text-center py-3 px-4">
                    <X className="w-5 h-5 text-red-500 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Advanced Threat Hunting</td>
                  <td className="text-center py-3 px-4">
                    <X className="w-5 h-5 text-red-500 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-4">
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">AI-Driven Analytics</td>
                  <td className="text-center py-3 px-4">Basic</td>
                  <td className="text-center py-3 px-4">Advanced</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
