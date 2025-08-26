import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Clock, Headphones, ShieldCheck, Lock } from 'lucide-react';

interface HomeProps {
  onTabChange: (tab: string) => void;
}

export default function Home({ onTabChange }: HomeProps) {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-nk-navy to-blue-800 rounded-2xl text-white p-8 md:p-12 mb-8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Enterprise Security Solutions
            </h1>
            <p className="text-xl mb-6 text-blue-100">
              Protect your business with industry-leading Symantec endpoint security licenses. 
              Professional support and instant delivery guaranteed.
            </p>
            <Button 
              data-testid="button-view-products"
              onClick={() => onTabChange('products')}
              className="bg-nk-orange hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold"
            >
              View Products
            </Button>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-6xl text-center mb-4">🛡️</div>
              <div className="text-center">
                <div className="text-sm text-blue-200">Trusted by 1000+ businesses</div>
                <div className="text-2xl font-bold">99.9% Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-nk-orange text-3xl mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Authorized Reselle</h3>
            <p className="text-gray-600">
              Official Symantec partner providing genuine licenses with full vendor support.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-nk-green text-3xl mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Delivery</h3>
            <p className="text-gray-600">
              License keys delivered immediately upon payment confirmation via email.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-blue-600 text-3xl mb-4">
              <Headphones className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Expert Support</h3>
            <p className="text-gray-600">
              Australian-based technical support for deployment and configuration assistance.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Featured Products Preview */}
      <section className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-6">Featured Security Solutions</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <ShieldCheck className="text-blue-600 w-8 h-8" />
                <div>
                  <h3 className="text-xl font-semibold">Symantec Endpoint Protection Enterprise</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Comprehensive endpoint security with advanced threat protection for enterprise environments.
              </p>
              <div className="text-2xl font-bold text-nk-orange mb-4">
                $89.99 <span className="text-sm text-gray-500">per seat/year</span>
              </div>
              <Button 
                data-testid="button-view-endpoint-protection"
                onClick={() => onTabChange('products')}
                className="w-full bg-nk-orange hover:bg-orange-600 text-white rounded-lg font-medium"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="text-green-600 w-8 h-8" />
                <div>
                  <h3 className="text-xl font-semibold">Symantec Endpoint Security Complete</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Complete security suite with EDR, threat hunting, and advanced analytics capabilities.
              </p>
              <div className="text-2xl font-bold text-nk-orange mb-4">
                $149.99 <span className="text-sm text-gray-500">per seat/year</span>
              </div>
              <Button 
                data-testid="button-view-endpoint-complete"
                onClick={() => onTabChange('products')}
                className="w-full bg-nk-orange hover:bg-orange-600 text-white rounded-lg font-medium"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
