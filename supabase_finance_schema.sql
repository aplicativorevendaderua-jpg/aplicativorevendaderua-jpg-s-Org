-- FINANCE MODULE SCHEMA UPDATE
-- Run this script in the Supabase SQL Editor to enable the Finance and Stock History features.

-- 1. Create stock_history table (if not exists)
CREATE TABLE IF NOT EXISTS public.stock_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE,
    change_type TEXT CHECK (change_type IN ('purchase', 'sale', 'adjustment')) NOT NULL,
    quantity INTEGER NOT NULL,
    cost_at_time DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create transactions table (if not exists)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    stock_history_id UUID REFERENCES public.stock_history(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.1. Add missing columns to orders (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='deliveryDate') THEN
        ALTER TABLE orders ADD COLUMN "deliveryDate" DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='paymentStatus') THEN
        ALTER TABLE orders ADD COLUMN "paymentStatus" TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Policies for stock_history
DROP POLICY IF EXISTS "Users can manage their own stock history" ON public.stock_history;
CREATE POLICY "Users can manage their own stock history" 
ON public.stock_history FOR ALL 
USING (auth.uid() = user_id);

-- 5. Policies for transactions
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL 
USING (auth.uid() = user_id);

-- 6. RPC functions for stock management (Atomic increment)
CREATE OR REPLACE FUNCTION increment_product_stock(p_id UUID, p_qty INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.products
    SET stock = stock + p_qty
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_variation_stock(v_id UUID, v_qty INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.product_variations
    SET stock = stock + v_qty
    WHERE id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to RPCs
GRANT EXECUTE ON FUNCTION increment_product_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_variation_stock(UUID, INTEGER) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
