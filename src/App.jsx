import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement
} from '@stripe/react-stripe-js';
import { CreditCard, Smartphone, Repeat, DollarSign, ArrowLeft, ArrowRight, User, Mail, Phone, MapPin } from 'lucide-react';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_51HTphfIeAxsjZjWK0VGZMs1IKHjmsz6r8UWkPRwkxknTciEVvGdNOWvgBSwMiptfEGeCJGmgSSCWT3QCbaSp1RFF00mDbfuTsP');
const API_BASE_URL = "https://calcrew.myosport.co/api/v1/"
const DonationForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Donation details
  const [amount, setAmount] = useState(35);
  const [customAmount, setCustomAmount] = useState('');
  const [isMonthly, setIsMonthly] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  
  // User information
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [message, setMessage] = useState('');

  const presetAmounts = [15, 35, 50];

  // Setup Payment Request (Google Pay/Apple Pay)
  useEffect(() => {
    if (stripe) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: `${isMonthly ? 'Monthly' : 'One-time'} Donation`,
          amount: getCurrentAmount() * 100,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      pr.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(pr);
        }
      });

      pr.on('paymentmethod', async (e) => {
        const response = await fetch(`${API_BASE_URL}payment/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: getCurrentAmount() * 100,
            currency: 'usd',
            payment_method_types: ['card'],
            recurring: isMonthly
          }),
        });

        const { client_secret } = await response.json();
        const result = await stripe.confirmCardPayment(client_secret, {
          payment_method: e.paymentMethod.id
        });

        if (result.error) {
          e.complete('fail');
          setMessage(result.error.message);
        } else {
          e.complete('success');
          setMessage('Payment successful!');
        }
      });
    }
  }, [stripe, amount, customAmount, isMonthly]);

  const getCurrentAmount = () => {
    return customAmount ? parseFloat(customAmount) : amount;
  };

  const handleUserInfoChange = (field, value) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateUserInfo = () => {
    const required = ['firstName', 'lastName', 'email'];
    return required.every(field => userInfo[field].trim() !== '');
  };

  const handleCardPayment = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage('');

    const cardElement = elements.getElement(CardElement);

    try {
      // Create payment intent
      const response = await fetch(`${API_BASE_URL}payment/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: getCurrentAmount() * 100,
          currency: 'usd',
          payment_method_types: ['card'],
          recurring: isMonthly,
          user_info: userInfo
        }),
      });

      const { client_secret } = await response.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${userInfo.firstName} ${userInfo.lastName}`,
            email: userInfo.email,
            phone: userInfo.phone,
            address: {
              line1: userInfo.address,
              city: userInfo.city,
              state: userInfo.state,
              postal_code: userInfo.zipCode,
              country: 'US'
            }
          },
        }
      });

      if (result.error) {
        setMessage(result.error.message);
      } else {
        setMessage('Payment successful! Thank you for your donation.');
        // Handle successful payment
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVenmoPayment = () => {
    setIsProcessing(true);
    // Simulate Venmo redirect
    setTimeout(() => {
      setMessage('Redirecting to Venmo...');
      // In real implementation, redirect to Venmo
      window.open(`https://venmo.com/pay?amount=${getCurrentAmount()}&note=Donation`, '_blank');
      setIsProcessing(false);
    }, 1000);
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        '::placeholder': {
          color: '#9ca3af',
        },
        iconColor: '#6b7280',
      },
    },
  };

  const renderStepIndicator = () => {
    const steps = selectedPaymentMethod === 'card' ? 3 : 1;
    if (selectedPaymentMethod !== 'card') return null;
    
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                currentStep >= step ? 'bg-[#041c3f] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep >= step ? 'text-[#041c3f]' : 'text-gray-500'
              }`}>
                {step === 1 && 'Amount'}
                {step === 2 && 'Your Info'}
                {step === 3 && 'Payment'}
              </span>
              {step < 3 && <div className="flex-1 h-px bg-gray-300 mx-4"></div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose an amount:</h2>
        <p className="text-gray-600">Your contribution will benefit our cause.</p>
      </div>

      {/* Amount Selection */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {presetAmounts.map((presetAmount) => (
            <button
              key={presetAmount}
              onClick={() => {
                setAmount(presetAmount);
                setCustomAmount('');
              }}
              className={`py-3 px-4 rounded-md text-lg font-semibold ${
                amount === presetAmount && !customAmount
                  ? 'bg-[#041c3f] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ${presetAmount}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500 text-lg">$</span>
          <input
            type="number"
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setAmount(0);
            }}
            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md text-lg focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
          />
        </div>
      </div>

      {/* Monthly Toggle */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Make it monthly!</h3>
        <div className="grid grid-cols-2 gap-0 rounded-md overflow-hidden border border-gray-300">
          <button
            onClick={() => setIsMonthly(true)}
            className={`py-3 px-4 text-center font-semibold ${
              isMonthly
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Yes, count me in!
          </button>
          <button
            onClick={() => setIsMonthly(false)}
            className={`py-3 px-4 text-center font-semibold ${
              !isMonthly
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            No, donate once
          </button>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Payment Method</h3>
        <div className="space-y-2">
          <button
            onClick={() => setSelectedPaymentMethod('card')}
            className={`w-full p-3 rounded-md border text-left ${
              selectedPaymentMethod === 'card'
                ? 'border-[#0e2d5b] bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <CreditCard className="inline w-5 h-5 mr-2" />
            Credit/Debit Card
          </button>

          {paymentRequest && (
            <button
              onClick={() => setSelectedPaymentMethod('digital_wallet')}
              className={`w-full p-3 rounded-md border text-left ${
                selectedPaymentMethod === 'digital_wallet'
                  ? 'border-[#0e2d5b] bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Smartphone className="inline w-5 h-5 mr-2" />
              Google Pay / Apple Pay
            </button>
          )}

          {/* <button
            onClick={() => setSelectedPaymentMethod('venmo')}
            className={`w-full p-3 rounded-md border text-left ${
              selectedPaymentMethod === 'venmo'
                ? 'border-[#0e2d5b] bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center">
              <div className="w-5 h-5 mr-2 bg-[#0e2d5b] rounded flex items-center justify-center text-white text-xs font-bold">V</div>
              Venmo
            </div>
          </button> */}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {selectedPaymentMethod === 'card' && (
          <button
            onClick={() => setCurrentStep(2)}
            className="w-full bg-[#041c3f] text-white py-3 px-4 rounded-md font-semibold hover:bg-[#041c3f] flex items-center justify-center"
          >
            Continue with Card
            <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        )}

        {selectedPaymentMethod === 'digital_wallet' && paymentRequest && (
          <PaymentRequestButtonElement 
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  theme: 'dark',
                  height: '48px',
                },
              },
            }}
          />
        )}

        {selectedPaymentMethod === 'venmo' && (
          <button
            onClick={handleVenmoPayment}
            disabled={isProcessing}
            className="w-full bg-[#0e2d5b] text-white py-3 px-4 rounded-md font-semibold hover:bg-[#041c3f] disabled:opacity-50"
          >
            {isProcessing ? 'Redirecting...' : `Pay with Venmo - $${getCurrentAmount()}`}
          </button>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Information</h2>
        <p className="text-gray-600">Please provide your details for the donation receipt.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline w-4 h-4 mr-1" />
              First Name *
            </label>
            <input
              type="text"
              value={userInfo.firstName}
              onChange={(e) => handleUserInfoChange('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={userInfo.lastName}
              onChange={(e) => handleUserInfoChange('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="inline w-4 h-4 mr-1" />
            Email Address *
          </label>
          <input
            type="email"
            value={userInfo.email}
            onChange={(e) => handleUserInfoChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="inline w-4 h-4 mr-1" />
            Phone Number
          </label>
          <input
            type="tel"
            value={userInfo.phone}
            onChange={(e) => handleUserInfoChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            Address
          </label>
          <input
            type="text"
            value={userInfo.address}
            onChange={(e) => handleUserInfoChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={userInfo.city}
              onChange={(e) => handleUserInfoChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              type="text"
              value={userInfo.state}
              onChange={(e) => handleUserInfoChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
            <input
              type="text"
              value={userInfo.zipCode}
              onChange={(e) => handleUserInfoChange('zipCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0e2d5b] focus:border-[#0e2d5b]"
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-3 mt-6">
        <button
          onClick={() => setCurrentStep(1)}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md font-semibold hover:bg-gray-300 flex items-center justify-center"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          disabled={!validateUserInfo()}
          className="flex-1 bg-[#041c3f] text-white py-3 px-4 rounded-md font-semibold hover:bg-[#041c3f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          Continue to Payment
          <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Details</h2>
        <p className="text-gray-600">Complete your ${getCurrentAmount()} {isMonthly ? 'monthly' : 'one-time'} donation.</p>
      </div>

      <div className="mb-4 p-3 border border-gray-300 rounded-md">
        <CardElement options={cardElementOptions} />
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setCurrentStep(2)}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md font-semibold hover:bg-gray-300 flex items-center justify-center"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleCardPayment}
          disabled={!stripe || isProcessing}
          className="flex-1 bg-[#041c3f] text-white py-3 px-4 rounded-md font-semibold hover:bg-[#041c3f] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : `Complete Donation - $${getCurrentAmount()}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-lg">
      {renderStepIndicator()}
      
      {selectedPaymentMethod === 'card' ? (
        <>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </>
      ) : (
        renderStep1()
      )}

      {/* Message Display */}
      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          message.includes('successful') 
            ? 'bg-green-100 text-green-700 border border-green-300' 
            : 'bg-red-100 text-red-700 border border-red-300'
        }`}>
          {message}
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is secure and encrypted</p>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gray-100 py-8">
        <DonationForm />
      </div>
    </Elements>
  );
};

export default App;