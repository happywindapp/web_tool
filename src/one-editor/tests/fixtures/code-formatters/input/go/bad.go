package orders

func Total(list []Order) float64 {
	sum := 0.0
	for _, o := range list {
		sum += o.Notional(
	}
	return sum
}
