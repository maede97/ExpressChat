var socket = io();
var notification = new Audio('/plucky.mp3');
socket.emit('join', username);
$(() => {
  $("#send").click(() => {
    sendMessage({
      message: $("#message").val()
    });
    $("#message").val("");
    $("#image").val("");
    $("#message").focus();
  });
  $("#message").keypress((e) => {
    if (e.which == 13) {
      sendMessage({
        message: $("#message").val()
      });
      $("#message").val("");
      $("#image").val("");
    } else {
      socket.emit('typing-all', username);
    }
  });
});

function sendMessage(message) {
  if ($("#image").val() != "") {
    var fd = new FormData();
    var files = $('#image')[0].files[0];
    fd.append('image', files);
    $.ajax({
      url: '/image',
      type: 'post',
      data: fd,
      contentType: false,
      processData: false,
    });
  } else {
    $.post(location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/message', message);
  }
}

function formatDate() {
  let d = new Date();
  return d.toISOString().slice(0, 10) + " " + d.toISOString().slice(11, 19)
}

function scrollToBottom() {
  $('.msg_history').scrollTop($('.msg_history')[0].scrollHeight);
}

$(document).ready(() => {
  scrollToBottom();
  $('#message').focus();
});

socket.on('login', data => {
  $('<div class="admin_msg"><p>' + data.user + ' just logged in.</p></div>').appendTo('.msg_history');
  scrollToBottom();
});
socket.on('logout', data => {
  $('<div class="admin_msg"><p>' + data.user + ' just logged out.</p></div>').appendTo('.msg_history');
  scrollToBottom();
});
socket.on('register', data => {
  $('<div class="admin_msg"><p>' + data.user + ' just registered. Say Hi!</p></div>').appendTo('.msg_history');
  scrollToBottom();
});

socket.on('typing-all', data => {
  $(".typing").html(data + " is now typing");
});

socket.on('privateMessage', data => {
  $('.messages').html('<div class="alert alert-info" role="alert">Private message from <a href="/chat/' + data.mFrom + '">' + data.mFrom + '</a>.');
  notification.play();
});

socket.on('message', data => {
  $(".typing").html("");
  if (data.image && data.image == true) {
    if (username == data.mFrom) {
      $('<div class="outgoing_msg">\
          <div class="sent_msg">\
            <img src="'+ data.message + '" style="width: 100%;" />\
            <span class="time_date">UTC '+ formatDate() + '</span>\
          </div>\
        </div>').appendTo('.msg_history');
    } else {
      notification.play();
      $('<div class="incoming_msg">\
          <div class="received_withd_msg">\
            <p>\
              <a href="/chat/'+ data.mFrom + '">' + data.mFrom + '</a>\
            </p>\
            <img src="'+ data.message + '" style="width: 100%;" />\
            <span class="time_date">UTC '+ formatDate() + '</span>\
          </div>\
        </div>').appendTo('.msg_history');
    }
  } else {
    if (username == data.mFrom) {
      $('<div class="outgoing_msg">\
          <div class="sent_msg">\
            <p>'+ data.message + '</p>\
            <span class="time_date">UTC '+ formatDate() + '</span>\
          </div>\
        </div>').appendTo('.msg_history');
    } else {
      notification.play();
      $('<div class="incoming_msg">\
          <div class="received_withd_msg">\
            <p>\
              <a href="/chat/'+ data.mFrom + '">' + data.mFrom + '</a>: ' + data.message + '\
            </p>\
            <span class="time_date">UTC '+ formatDate() + '</span>\
          </div>\
        </div>').appendTo('.msg_history');
    }
  }
  scrollToBottom();
});