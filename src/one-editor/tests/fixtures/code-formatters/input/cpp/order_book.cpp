#include <vector>
#include <string>
#include <algorithm>
namespace demo{
struct Order{std::string id;std::string symbol;int qty;double price;};
class OrderBook{
public:
explicit OrderBook(std::vector<Order> orders):orders_(std::move(orders)){}
void add(const Order& o){if(o.qty<=0)return;orders_.push_back(o);}
double notional() const{double s=0;for(const auto& o:orders_){s+=o.qty*o.price;}return s;}
std::vector<Order> bySymbol(const std::string& sym) const {
std::vector<Order> out;
std::copy_if(orders_.begin(),orders_.end(),std::back_inserter(out),[&](const Order& o){return o.symbol==sym;});
return out;}
private:
std::vector<Order> orders_;
};
}  // namespace demo
int main(){demo::OrderBook book({{"ORD-1","ACME",100,25.5},{"ORD-2","DEMO",0,10.0}});return book.notional()>0?0:1;}
