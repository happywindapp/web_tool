// Package orders is fake sample code for formatter tests.
package orders
import "sort"
type Side int
const (
Buy Side = iota // bid
	Sell // ask
)
type Level struct {
	Price float64 `json:"price"`
	Qty int64 `json:"qty,omitempty"`
}
type Number interface{ ~int | ~int64 | ~float64 }
func Sum[T Number](xs []T) (total T) {
	for _, x := range xs { total += x }
	return
}
func Sorted(levels []Level, side Side) []Level {
	out := append([]Level(nil), levels...)
	sort.Slice(out, func(i, j int) bool {
		if side == Buy { return out[i].Price > out[j].Price }
		return out[i].Price < out[j].Price
	})
	m := map[string]int{"a":1,"bb":2,
	"ccc":3}
	_ = m
	switch {
	case len(out) == 0: return nil
	default:
	}
	return out
}
