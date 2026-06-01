package mitiok.ddns.net.audio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@SpringBootApplication
public class VideoCallApplication {
  public static void main(String[] args) {
    SpringApplication.run(VideoCallApplication.class, args);
  }
}


@Component
class SignalingHandler extends TextWebSocketHandler {

  private final Set<WebSocketSession> sessions = Collections.synchronizedSet(new HashSet<>());

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    sessions.add(session);
    System.out.println("Nuova connessione: " + session.getId());
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    synchronized (sessions) {
      for (WebSocketSession s : sessions) {
        if (s.isOpen() && !s.getId().equals(session.getId())) {
          s.sendMessage(message);
        }
      }
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
    sessions.remove(session);
    System.out.println("Connessione chiusa: " + session.getId());
  }
}


@Configuration
@EnableWebSocket
class WebSocketConfig implements WebSocketConfigurer {

  private final SignalingHandler signalingHandler;

  public WebSocketConfig(SignalingHandler signalingHandler) {
    this.signalingHandler = signalingHandler;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry.addHandler(signalingHandler, "/ws")
      .setAllowedOrigins("*");
  }
}

