package demo.orders;
import java.util.List;
import java.util.stream.Collectors;
public class OrderBook{
private final List<Order> orders;
public OrderBook(List<Order> orders){this.orders=orders;}
public double notional(){return orders.stream().filter(o->o.qty()>0).mapToDouble(o->o.qty()*o.price()).sum();}
public List<String> ids(String symbol){
return orders.stream().filter(o->o.symbol().equals(symbol)).map(Order::id).collect(Collectors.toList());}
@Override public String toString(){return "OrderBook["+orders.size()+"]";}
}
